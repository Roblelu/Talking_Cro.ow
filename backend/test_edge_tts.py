
import asyncio
from tts_engine import tts_engine
async def test():
    try:
        res = await tts_engine.generate_file('Hola Vridel')
        print('SUCCESS:', res)
    except Exception as e:
        print('ERROR:', e)
asyncio.run(test())

