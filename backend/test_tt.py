import asyncio
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent

def start():
    client = TikTokLiveClient(unique_id="itsshogun_")

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        print("Connected!")
        
    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        print("Comment:", event.comment)

    print("Starting...")
    try:
        client.run() # .run() is blocking and sets up the loop automatically in TikTokLive
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    start()
