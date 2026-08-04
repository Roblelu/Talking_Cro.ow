import asyncio
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent

async def main():
    try:
        # Usa el mismo usuario que vio en la captura
        client = TikTokLiveClient(unique_id="@Hevelgate")
        
        @client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            print(f"Conectado exitosamente al stream!")
            
        @client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            print(f"{event.user.nickname}: {event.comment}")
            # Si leemos 3 comentarios, detenemos
            global count
            count += 1
            if count >= 3:
                client.stop()
                
        global count
        count = 0
        await client.start()
    except Exception as e:
        print(f"Error fatal: {e}")

if __name__ == '__main__':
    asyncio.run(main())
