import os
import asyncio
import subprocess
import uuid
import winsound
import torch
from TTS.api import TTS

# PyTorch 2.6+ compatibility patch for TTS checkpoint loading
_original_load = torch.load
def _patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)
torch.load = _patched_load

import torchaudio
import soundfile as sf

def _patched_torchaudio_load(filepath, *args, **kwargs):
    data, samplerate = sf.read(filepath)
    if len(data.shape) == 1:
        data = data.reshape(1, -1)
    else:
        data = data.transpose()
    tensor_data = torch.FloatTensor(data)
    return tensor_data, samplerate

torchaudio.load = _patched_torchaudio_load
torchaudio.info = lambda *args, **kwargs: None

class TTSEngine:
    def __init__(self):
        self.is_loaded = False
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tts = None
        self.default_voice_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts", "vridel_ref_clean.wav")
        import threading
        self.synth_lock = threading.Lock()
        print(f"[Local XTTS Engine] Inicializando motor de clonación en modo local ({self.device})...")

    def load(self):
        if not self.is_loaded:
            print("[Local XTTS Engine] Descargando/Cargando modelo XTTS v2 en memoria. Esto puede tardar...")
            # Init TTS
            self.tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(self.device)
            self.is_loaded = True
            print("[Local XTTS Engine] Modelo cargado exitosamente.")

    async def generate_audio(self, text, reference_audio_path, output_path, username="Streamer"):
        if not self.is_loaded:
            self.load()

        loop = asyncio.get_event_loop()

        def run_request():
            try:
                with self.synth_lock:
                    print(f"[Local XTTS Engine] Sintetizando voz para: {username}...")
                    
                    # Use provided reference or fallback to default
                    ref_path = reference_audio_path if reference_audio_path and os.path.exists(reference_audio_path) else self.default_voice_path
                    
                    if not os.path.exists(ref_path):
                        print(f"[Local XTTS Engine ERROR] Archivo de audio de referencia no encontrado: {ref_path}")
                        return
    
                    # Generate audio
                    self.tts.tts_to_file(
                        text=text,
                        speaker_wav=ref_path,
                        language="es",
                        file_path=output_path
                    )
                    
                    # Convert to PCM 16-bit for maximum HTML5 <audio> compatibility
                    import soundfile as sf_write
                    audio_data, sr = sf_write.read(output_path)
                    sf_write.write(output_path, audio_data, sr, subtype='PCM_16')
                    
                    print(f"[Local XTTS Engine] Síntesis completada: {output_path}")

            except Exception as e:
                print(f"[Local XTTS Engine FATAL ERROR] Falla en generación XTTS: {e}")

        await loop.run_in_executor(None, run_request)
        return output_path

    async def generate_file(self, text, reference_audio_path=None):
        token = str(uuid.uuid4())
        base_dir = os.path.dirname(os.path.abspath(__file__))
        audio_dir = os.path.join(base_dir, "audio_queue")
        os.makedirs(audio_dir, exist_ok=True)
        out_wav = os.path.join(audio_dir, f"{token}.wav")
        await self.generate_audio(text, reference_audio_path, out_wav)
        return f"{token}.wav"

tts_engine = TTSEngine()
