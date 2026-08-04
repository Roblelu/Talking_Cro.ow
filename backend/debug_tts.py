import asyncio
import os
import sys

# Agregar el directorio al path para poder importar tts_engine
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from tts_engine import tts_engine

async def main():
    print("Iniciando prueba manual de F5-TTS...")
    text = "@simulador dice: Prueba directa de voz."
    await tts_engine.generate_and_play(text)
    print("Prueba finalizada.")

if __name__ == "__main__":
    asyncio.run(main())
