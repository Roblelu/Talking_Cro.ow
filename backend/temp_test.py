import asyncio
import os
from TikTokLive import TikTokLiveClient
from TikTokLive.client.web.web_settings import WebDefaults

sign_api_key = os.environ.get("TIKTOK_SIGN_API_KEY")
if not sign_api_key:
    raise RuntimeError("Define TIKTOK_SIGN_API_KEY antes de ejecutar esta prueba")
WebDefaults.sign_api_key = sign_api_key

async def test():
    c = TikTokLiveClient('facuuparejas')
    print("Iniciando conexion...")
    try:
        await c.start()
    except Exception as e:
        print("Error capturado:", e)

asyncio.run(test())
