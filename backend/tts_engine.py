"""
Módulo: tts_engine.py

Gestiona la síntesis de voz (Text-to-Speech) usando Edge-TTS.
Decisión Arquitectónica y Procesamiento de Cola Local:
- La cola de TTS se alimenta desde los eventos del chat de TikTok.
- El procesamiento se delega a este motor de forma aislada para evitar que la red
  bloquee la captura de eventos en tiempo real.
- Economía: Se utiliza `edge-tts` (Microsoft Edge Speech) porque provee voces neuronales
  de alta calidad de manera GRATUITA sin necesidad de API Keys comerciales de Azure/Google.
  Esto reduce el costo de operación del servicio a $0 (cero costos fijos o comisiones por síntesis).
"""
import os
import asyncio
import uuid
import edge_tts

class TTSEngine:
    """
    Clase que encapsula la generación de audio TTS.
    Por qué: Facilita mantener un estado persistente (configuraciones por defecto) y
    abstrae la ruta de almacenamiento (appdata) de la lógica de generación asíncrona.
    """
    def __init__(self):
        self.is_loaded = False
        # Voz natural en español por defecto de Edge-TTS
        # Otras opciones: es-MX-JorgeNeural, es-ES-AlvaroNeural, es-ES-ElviraNeural
        self.voice = "es-MX-DaliaNeural" 
        print(f"[Motor de Voz] Inicializando motor de voz en la nube... Voz: {self.voice}")

    def load(self):
        # Edge TTS no requiere carga de modelos pesados en RAM
        if not self.is_loaded:
            print("[Motor de Voz] Motor cargado y listo (Instantáneo).")
            self.is_loaded = True

    async def generate_file(self, text, reference_audio_path=None, voice="es-MX-DaliaNeural", rate="+0%", volume="+0%"):
        """
        Sintetiza un texto y lo guarda como .mp3 de forma asíncrona.
        Por qué asíncrono: Asegura que el hilo principal (donde se reciben eventos de TikTok Live
        y se emiten SSE) nunca se congele mientras se espera la respuesta HTTP de Microsoft Edge.
        Utiliza UUIDs para que múltiples mensajes puedan ser procesados concurrentemente sin
        sobreescribir archivos temporales.
        """
        if not self.is_loaded:
            self.load()
            
        token = str(uuid.uuid4())
        import sys
        if getattr(sys, 'frozen', False):
            base_dir = os.path.join(os.environ.get('APPDATA', ''), 'TalkingCrow')
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        audio_dir = os.path.join(base_dir, "audio_queue")
        os.makedirs(audio_dir, exist_ok=True)
        
        out_path = os.path.join(audio_dir, f"{token}.mp3")
        
        try:
            print(f"[Motor de Voz] Sintetizando voz: {text[:30]}... ({voice}, {rate}, {volume})")
            communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
            await communicate.save(out_path)
            print(f"[Motor de Voz] Síntesis completada instantánea: {out_path}")
            return f"{token}.mp3"
        except Exception as e:
            print(f"[Motor de Voz ERROR] Fallo generando voz: {e}")
            raise e

    def get_audio_dir(self):
        """Retorna el directorio de audio_queue."""
        import sys
        if getattr(sys, 'frozen', False):
            base_dir = os.path.join(os.environ.get('APPDATA', ''), 'TalkingCrow')
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(base_dir, "audio_queue")

    def cleanup_old_files(self, max_age_seconds=7200, max_total_mb=500):
        """
        Elimina archivos de audio antiguos y controla el tamaño total del directorio de salida local.
        Por qué: En transmisiones largas, la generación constante de audios de TTS llenaría
        rápidamente el almacenamiento del usuario. Actúa como un recolector de basura (Garbage Collector)
        que previene crashes por falta de espacio en disco (OOM Storage).
        """
        import time
        audio_dir = self.get_audio_dir()
        if not os.path.exists(audio_dir):
            return
        
        now = time.time()
        files_removed = 0
        bytes_freed = 0
        
        # Fase 1: Eliminar archivos más viejos que max_age_seconds
        for filename in os.listdir(audio_dir):
            if not filename.endswith(('.mp3', '.wav')):
                continue
            filepath = os.path.join(audio_dir, filename)
            try:
                file_age = now - os.path.getmtime(filepath)
                if file_age > max_age_seconds:
                    file_size = os.path.getsize(filepath)
                    os.remove(filepath)
                    files_removed += 1
                    bytes_freed += file_size
            except OSError:
                continue
        
        # Fase 2: Si el directorio aún excede la cuota, borrar los más viejos
        total_size = 0
        file_list = []
        for filename in os.listdir(audio_dir):
            if not filename.endswith(('.mp3', '.wav')):
                continue
            filepath = os.path.join(audio_dir, filename)
            try:
                fsize = os.path.getsize(filepath)
                fmtime = os.path.getmtime(filepath)
                total_size += fsize
                file_list.append((filepath, fmtime, fsize))
            except OSError:
                continue
        
        max_total_bytes = max_total_mb * 1024 * 1024
        if total_size > max_total_bytes:
            # Ordenar por antigüedad (más viejo primero)
            file_list.sort(key=lambda x: x[1])
            for filepath, _, fsize in file_list:
                if total_size <= max_total_bytes:
                    break
                try:
                    os.remove(filepath)
                    total_size -= fsize
                    files_removed += 1
                    bytes_freed += fsize
                except OSError:
                    continue
        
        if files_removed > 0:
            print(f"[Limpieza TTS] Eliminados {files_removed} archivos ({bytes_freed / 1024 / 1024:.1f} MB liberados)")

tts_engine = TTSEngine()
