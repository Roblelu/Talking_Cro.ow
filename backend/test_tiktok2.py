import asyncio, logging
logging.basicConfig(level=logging.ERROR)
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent
async def main():
    client = TikTokLiveClient('lapaiperyjefecito')
    @client.on(ConnectEvent)
    async def on_connect(event):
        print('CONNECTED EVENT FIRED!')
    await client.start()
asyncio.run(main())
