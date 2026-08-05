import asyncio
from TikTokLive import TikTokLiveClient
from TikTokLive.client.web.web_settings import WebDefaults

WebDefaults.sign_api_key = "euler_Y2E0OTVjMDJjNzQyNTNkNmIzZTM4OTU1NjhhNTY1MzUzODdlODlhZDRlODg3MTY1NTc0Mzdi"

async def test():
    c = TikTokLiveClient('facuuparejas')
    print("Iniciando conexion...")
    try:
        await c.start()
    except Exception as e:
        print("Error capturado:", e)

asyncio.run(test())
