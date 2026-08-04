import logging
import sys
from TikTokLive import TikTokLiveClient

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)

client = TikTokLiveClient(unique_id="el_mago_de_joss")
print("Empezando cliente...")
try:
    client.run()
except Exception as e:
    print(f"Error fatal: {e}")
