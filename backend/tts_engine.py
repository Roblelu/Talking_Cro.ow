"""
Módulo: tts_engine.py
Gestiona la síntesis de voz (Text-to-Speech) usando Edge TTS.
"""
import os
import asyncio
import uuid
import edge_tts
from runtime_paths import get_data_dir

class TTSEngine:
    """
    Clase que encapsula la generación de audio TTS usando el motor gratuito de Edge.
    """
    def __init__(self):
        self.is_loaded = False
        self.voice = "es-MX-DaliaNeural" 
        print(f"[Motor de Voz] Inicializando motor Edge TTS... Voz: {self.voice}")

    def load(self):
        if not self.is_loaded:
            print("[Motor de Voz Edge] Motor cargado y listo (Instantáneo).")
            self.is_loaded = True

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
        if not self.is_loaded:
            self.load()
            
        text = self._clean_text_for_tts(text)
        token = str(uuid.uuid4())
        
        base_dir = get_data_dir()
        audio_dir = os.path.join(base_dir, "audio_queue")
        os.makedirs(audio_dir, exist_ok=True)
        out_path = os.path.join(audio_dir, f"{token}.mp3")
        
        try:
            # Safe print to avoid UnicodeEncodeError in console
            safe_text = text[:30].encode('ascii', 'ignore').decode('ascii')
            print(f"[Motor de Voz] Sintetizando voz: {safe_text}... ({voice}, {rate}, {volume})")
            
            communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
            await communicate.save(out_path)
            print(f"[Motor de Voz] Síntesis completada instantánea: {out_path}")
            return f"{token}.mp3"
        except Exception as e:
            print(f"[Motor de Voz ERROR] Fallo generando voz: {e}")
            raise e

    def get_audio_dir(self):
        base_dir = get_data_dir()
        return os.path.join(base_dir, "audio_queue")

    def cleanup_old_files(self, max_age_seconds=7200, max_total_mb=500):
        import time
        audio_dir = self.get_audio_dir()
        if not os.path.exists(audio_dir):
            return
        
        now = time.time()
        files_removed = 0
        bytes_freed = 0
        
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
