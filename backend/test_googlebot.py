import requests
import re
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
}
res = requests.get('https://www.tiktok.com/@d4n1el325', headers=headers)
print('status:', res.status_code)

match3 = re.search(r'<meta property="og:image" content="([^"]+)"', res.text)
if match3:
    print('Avatar from meta:', match3.group(1))
else:
    print('Nothing found')
