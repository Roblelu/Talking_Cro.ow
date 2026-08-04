import os
import asyncio
import subprocess
import requests
import uuid
import winsound

class TTSEngine:
    def __init__(self):
        self.is_loaded = False
        # URL de la Firebase Function (Local emulador para pruebas)
        self.base_url = "http://127.0.0.1:5001/talking-crow/us-central1"
        self.default_voice_id = "pNInz6obpgDQGcFmaJgB" 
        
        print("[Cloud TTS Engine] Inicializando motor de clonación a través de Firebase API...")
        
    def load(self):
        self.is_loaded = True
        print("[Cloud TTS Engine] Conexión establecida con Firebase API.")

    async def generate_audio(self, text, reference_audio_path, output_path, username="Streamer"):
        if not self.is_loaded:
            self.load()
            
        loop = asyncio.get_event_loop()
        
        def run_request():
            import base64
            
            is_ephemeral = False
            audio_base64 = None
            
            # 1. Leer audio local a base64 si existe
            if reference_audio_path and os.path.exists(reference_audio_path):
                with open(reference_audio_path, "rb") as f:
                    audio_base64 = base64.b64encode(f.read()).decode('utf-8')
                is_ephemeral = True
            
            print(f"[Cloud TTS Engine] Solicitando TTS a Firebase API para: {username}...")
            
            # 2. Enviar solicitud a la Cloud Function de Firebase
            url = f"{self.base_url}/generateTTS"
            
            data = {
                "text": text,
                "username": username,
                "is_ephemeral": is_ephemeral,
                "audio_base64": audio_base64
            }
            
            try:
                response = requests.post(url, json=data)
                
                if response.status_code == 200:
                    resp_json = response.json()
                    returned_b64 = resp_json.get("audio_base64")
                    
                    if returned_b64:
                        temp_mp3 = output_path.replace('.wav', '.mp3')
                        
                        # Decodificar mp3 y guardar temporalmente
                        with open(temp_mp3, "wb") as f:
                            f.write(base64.b64decode(returned_b64))
                        
                        # Convertir a formato deseado con ffmpeg si es necesario
                        base_dir = os.path.dirname(os.path.abspath(__file__))
                        ffmpeg_path = os.path.join(base_dir, "ffmpeg.exe")
                        cmd = [ffmpeg_path, "-y", "-i", temp_mp3, output_path]
                        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=0x08000000)
                        
                        if os.path.exists(temp_mp3):
                            os.remove(temp_mp3)
                    else:
                        print(f"[Cloud TTS Engine ERROR] Firebase API no devolvió audio en Base64.")
                else:
                    print(f"[Cloud TTS Engine ERROR] Fallo de Firebase API. Código: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"[Cloud TTS Engine FATAL ERROR] Falla conectando a Firebase API: {e}")
                    
        await loop.run_in_executor(None, run_request)
        return output_path

    async def generate_and_play(self, text, reference_audio_path=None):
        token = str(uuid.uuid4())
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        audio_dir = os.path.join(base_dir, "audio_queue")
        os.makedirs(audio_dir, exist_ok=True)
        out_wav = os.path.join(audio_dir, f"{token}.wav")
        
        await self.generate_audio(text, reference_audio_path, out_wav)
        
        if os.path.exists(out_wav):
            print(f"[Cloud TTS Engine] Reproduciendo transmisión local: '{text[:40]}...'")
            winsound.PlaySound(out_wav, winsound.SND_FILENAME)
            # Cleanup para no saturar disco
            try:
                os.remove(out_wav)
            except:
                pass

tts_engine = TTSEngine()
