import requests
import json
import base64

BASE_URL = "http://127.0.0.1:5001/talking-crow/us-central1"

print("1. Probando obtención de Euler Key...")
try:
    res = requests.post(f"{BASE_URL}/getEulerKey", json={"username": "@testuser"})
    print("Status:", res.status_code)
    print("Response:", res.json())
except Exception as e:
    print("Error:", e)

print("\n2. Probando generación de TTS seguro (sin clonación efímera)...")
try:
    res = requests.post(f"{BASE_URL}/generateTTS", json={
        "username": "@testuser",
        "text": "Esta es una prueba de síntesis a través de Firebase seguro.",
        "is_ephemeral": False
    })
    print("Status:", res.status_code)
    if res.status_code == 200:
        audio = res.json().get("audio_base64")
        if audio:
            print(f"Éxito: Se recibió audio base64 de tamaño {len(audio)}")
            with open("test_output.mp3", "wb") as f:
                f.write(base64.b64decode(audio))
            print("Audio guardado como test_output.mp3")
        else:
            print("No se recibió audio_base64")
    else:
        print("Response:", res.text)
except Exception as e:
    print("Error:", e)
