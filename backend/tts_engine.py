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
        print(f"[Motor de Voz] Inicializando motor de voz en la nube... Voz: {self.voice}")

    def load(self):
        # Edge TTS no requiere carga de modelos pesados en RAM
        if not self.is_loaded:
            print("[Motor de Voz] Motor cargado y listo (Instantáneo).")
            self.is_loaded = True

    async def generate_file(self, text, reference_audio_path=None, voice="es-MX-DaliaNeural", rate="+0%", volume="+0%"):
        if not self.is_loaded:
            self.load()
            
        token = str(uuid.uuid4())
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

tts_engine = TTSEngine()
