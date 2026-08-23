import asyncio, logging
logging.basicConfig(level=logging.DEBUG)
from TikTokLive import TikTokLiveClient
async def main():
    client = TikTokLiveClient('lapaiperyjefecito')
    await client.start()
asyncio.run(main())
