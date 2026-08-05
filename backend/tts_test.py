import asyncio
import os
import sys

# Agregar ruta para que pueda importar desde tts_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from tts_engine import tts_engine
import requests

async def test_audio():
    print("Sintetizando audio genérico...")
    filename = await tts_engine.generate_file("Hola Vridel. Esta es la prueba de audio del cuervo, probando 1, 2, 3.", None)
    print(f"Audio generado: {filename}")
    
    url = "http://127.0.0.1:8763/api/internal/broadcast"
    data = {
        "type": "priority_audio",
        "username": "Prueba de Vridel",
        "message": "Hola Vridel. Esta es la prueba de audio...",
        "audio_url": f"http://127.0.0.1:8763/api/audio/{filename}",
        "audio_id": filename
    }
    
    # Mandamos con el token local
    headers = {"Authorization": "Bearer 2b09bddee14344e570592397a17fe5bf"}
    res = requests.post(url, json=data, headers=headers)
    print("Respuesta de broadcast:", res.text)

asyncio.run(test_audio())
