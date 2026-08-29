"""
Módulo: tts_engine.py

Gestiona la síntesis de voz (Text-to-Speech) usando el Motor de Voz Inteligente.
Decisión Arquitectónica y Procesamiento de Cola Local:
- La cola de TTS se alimenta desde los eventos del chat en tiempo real.
- El procesamiento se delega a este motor de Voz Inteligente de forma aislada para evitar que la red
  bloquee la captura de eventos.
- Economía: Se utiliza el Motor de Voz Inteligente porque provee voces neuronales
  de alta calidad de manera GRATUITA sin necesidad de API Keys comerciales.
  Esto reduce el costo de operación del servicio a 0 (cero costos fijos o comisiones por síntesis).

Riesgos:
- Dependencia de un servicio de Voz Inteligente en la nube sin autenticación formal, lo cual podría llevar a bloqueos por IP si se abusa (Rate limiting).
- Fallos en la red pueden retrasar la cola de generación de audio.

Formas de comprobarla:
- Verificar que los archivos .mp3 se generen en la carpeta temporal.
- Comprobar los logs del motor para confirmar inicialización instantánea.
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
        # Voz natural en español por defecto del Motor de Voz Inteligente
        # Otras opciones disponibles según el proveedor subyacente
        self.voice = "es-MX-DaliaNeural" 
        print(f"[Motor de Voz] Inicializando motor de Voz Inteligente en la nube... Voz: {self.voice}")

    def load(self):
        # El Motor de Voz Inteligente no requiere carga de modelos pesados en RAM, 
        # su inicialización es prácticamente instantánea.
        if not self.is_loaded:
            print("[Motor de Voz Inteligente] Motor cargado y listo (Instantáneo).")
            self.is_loaded = True

    def _is_compiled(self):
        import sys
        return getattr(sys, 'frozen', False) or '__compiled__' in globals()

    async def generate_file(self, text, reference_audio_path=None, voice="es-MX-DaliaNeural", rate="+0%", volume="+0%"):
        """
        Sintetiza un texto usando el Motor de Voz Inteligente y lo guarda como .mp3 de forma asíncrona.
        
        ¿Por qué asíncrono? 
        Asegura que el hilo principal (donde se reciben eventos del stream y se emiten SSE) 
        nunca se congele mientras se espera la respuesta HTTP de la API de Voz Inteligente.
        
        ¿Por qué UUIDs?
        Utiliza identificadores únicos (UUIDs) para que múltiples mensajes en la cola puedan ser 
        procesados y generados concurrentemente sin sobreescribir archivos temporales de otros usuarios.
        
        Riesgos:
        - Si la API externa responde lento, la cola de audio se acumulará.
        
        Formas de comprobarla:
        - Mandar varios requests en ráfaga y verificar que todos devuelven un archivo con UUID distinto sin bloquear el event loop.
        """
        if not self.is_loaded:
            self.load()
            
        token = str(uuid.uuid4())
        import sys
        if self._is_compiled():
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
        if self._is_compiled():
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
