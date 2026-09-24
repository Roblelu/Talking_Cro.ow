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
from runtime_paths import get_data_dir
import os
import azure.cognitiveservices.speech as speechsdk
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY", "")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION", "eastus")

def _synthesize_sync(text, out_path, voice, rate, volume):
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    # The SDK snapshots SpeechConfig when the synthesizer is constructed.
    # Set both voice and locale before constructing it, including default prosody.
    locale = '-'.join(voice.split('-')[:2])
    speech_config.speech_synthesis_voice_name = voice
    speech_config.speech_synthesis_language = locale
    speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
    
    audio_config = speechsdk.audio.AudioOutputConfig(filename=out_path)
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
    
    if rate == "+0%" and volume == "+0%":
        result = synthesizer.speak_text_async(text).get()
    else:
        # Usar SSML para manejar rate y volume
        import xml.sax.saxutils as saxutils
        safe_text = saxutils.escape(text)
        ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{locale}">
    <voice name="{voice}">
        <prosody rate="{rate}" volume="{volume}">
            {safe_text}
        </prosody>
    </voice>
</speak>"""
        result = synthesizer.speak_ssml_async(ssml).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return True
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        raise Exception(f"Azure Speech cancelado: {cancellation_details.reason}. Detalles: {cancellation_details.error_details}")

class TTSEngine:
    """
    Clase que encapsula la generación de audio TTS usando Microsoft Azure Oficial.
    """
    def __init__(self):
        self.is_loaded = False
        self.voice = "es-MX-DaliaNeural" 
        print(f"[Motor de Voz] Inicializando motor oficial Azure Cognitive Services... Voz: {self.voice}")

    def load(self):
        if not self.is_loaded:
            print("[Motor de Voz Azure] Motor cargado y listo.")
            self.is_loaded = True

    def _is_compiled(self):
        import sys
        return getattr(sys, 'frozen', False) or '__compiled__' in globals()

    def _clean_text_for_tts(self, text):
        import re
        text = re.sub(r'http\S+', '', text)
        emoji_pattern = re.compile(
            "["
            "\U0001f600-\U0001f650"
            "\U0001f300-\U0001f5ff"
            "\U0001f680-\U0001f6ff"
            "\U0001f1e6-\U0001f1ff"
            "\u2600-\u26ff"
            "\u2700-\u27bf"
            "\U0001f900-\U0001f9ff"
            "\U0001fa70-\U0001faff"
            "\u200d\ufe0f"
            "]+",
            flags=re.UNICODE
        )
        cleaned = emoji_pattern.sub(r'', text).strip()
        return cleaned if cleaned else " "

    async def generate_file(self, text, reference_audio_path=None, voice="es-MX-DaliaNeural", rate="+0%", volume="+0%"):
        """
        Sintetiza usando el SDK Oficial de Azure. Delega el bloqueo I/O a un thread paralelo.
        """
        if not self.is_loaded:
            self.load()
            
        text = self._clean_text_for_tts(text)
        token = str(uuid.uuid4())
        
        base_dir = get_data_dir()
            
        audio_dir = os.path.join(base_dir, "audio_queue")
        os.makedirs(audio_dir, exist_ok=True)
        out_path = os.path.join(audio_dir, f"{token}.mp3")
        
        try:
            print(f"[Motor de Voz] Sintetizando con Azure: {text[:30]}... ({voice}, {rate}, {volume})")
            await asyncio.to_thread(_synthesize_sync, text, out_path, voice, rate, volume)
            print(f"[Motor de Voz] Síntesis exitosa: {out_path}")
            return f"{token}.mp3"
        except Exception as e:
            print(f"[Motor de Voz ERROR] Fallo generando voz: {e}")
            raise e

    def get_audio_dir(self):
        """Retorna el directorio de audio_queue."""
        import sys
        base_dir = get_data_dir()
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
