import asyncio
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent

username = "el_mago_de_joss"
print(f"Intentando conectar a {username}...")
client = TikTokLiveClient(unique_id=username)

@client.on(ConnectEvent)
async def on_connect(event: ConnectEvent):
    print(f"Conectado a Room ID: {event.room_id}")

@client.on(CommentEvent)
async def on_comment(event: CommentEvent):
    print(f"Comentario de @{event.user.unique_id}: {event.comment}")

if __name__ == '__main__':
    client.run()
