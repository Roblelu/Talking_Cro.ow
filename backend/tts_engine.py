import os
import asyncio
import uuid
import edge_tts

class TTSEngine:
    def __init__(self):
        self.is_loaded = False
        # Voz natural en español por defecto de Edge-TTS
        # Otras opciones: es-MX-JorgeNeural, es-ES-AlvaroNeural, es-ES-ElviraNeural
        self.voice = "es-MX-DaliaNeural" 
        print(f"[Edge TTS Engine] Inicializando motor de voz en la nube (Edge)... Voz: {self.voice}")

    def load(self):
        # Edge TTS no requiere carga de modelos pesados en RAM
        if not self.is_loaded:
            print("[Edge TTS Engine] Motor cargado y listo (Instantáneo).")
            self.is_loaded = True

    async def generate_file(self, text, reference_audio_path=None):
        if not self.is_loaded:
            self.load()
            
        token = str(uuid.uuid4())
        base_dir = os.path.dirname(os.path.abspath(__file__))
        audio_dir = os.path.join(base_dir, "audio_queue")
        os.makedirs(audio_dir, exist_ok=True)
        
        out_path = os.path.join(audio_dir, f"{token}.mp3")
        
        try:
            print(f"[Edge TTS Engine] Sintetizando voz: {text[:30]}...")
            communicate = edge_tts.Communicate(text, self.voice)
            await communicate.save(out_path)
            print(f"[Edge TTS Engine] Síntesis completada instantánea: {out_path}")
            return f"{token}.mp3"
        except Exception as e:
            print(f"[Edge TTS Engine ERROR] Fallo generando voz: {e}")
            raise e

tts_engine = TTSEngine()
