import asyncio
import os
import time

# Importamos la misma instancia de motor que usa app.py
from tts_engine import tts_engine

async def main():
    print("========================================")
    print("   PRUEBA DE CLONACION DE VOZ (XTTS)    ")
    print("========================================")
    print("Cargando motor de IA (Puede tardar)...")
    
    start_time = time.time()
    tts_engine.load()
    print(f"[OK] Motor cargado en {time.time() - start_time:.2f} segundos.")
    
    texto_prueba = "Hola Vridel. Esta es una prueba de clonacion de voz rapida para verificar que el sistema de inteligencia artificial esta operativo y generando los archivos de sonido correctamente."
    
    print(f"\nGenerando audio para: '{texto_prueba}'")
    print("Por favor, espera unos segundos...")
    
    start_time = time.time()
    filename = await tts_engine.generate_file(texto_prueba)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    audio_path = os.path.join(base_dir, "audio_queue", filename)
    
    print(f"[OK] Audio generado en {time.time() - start_time:.2f} segundos.")
    print(f"Ruta del archivo: {audio_path}")
    
    if os.path.exists(audio_path):
        size_kb = os.path.getsize(audio_path) / 1024
        print(f"Tamano: {size_kb:.2f} KB")
        print("\nPrueba Completada Exitosamente!")
        print("Ve a la carpeta audio_queue para escuchar el audio de prueba.")
    else:
        print("\n[ERROR] El motor reporto exito pero el archivo no se encontro.")

if __name__ == "__main__":
    asyncio.run(main())
