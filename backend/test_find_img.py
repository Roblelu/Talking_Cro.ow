import requests
import re

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
}
res = requests.get('https://www.tiktok.com/@d4n1el325', headers=headers)
urls = re.findall(r'https://[^\s\"\']+\.jpeg', res.text)
for u in set(urls):
    print(u)
