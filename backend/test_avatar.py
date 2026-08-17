import requests
import re
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
}
res = requests.get('https://www.tiktok.com/@d4n1el325', headers=headers)
print('status:', res.status_code)
match = re.search(r'<script id="SIGI_STATE" type="application/json">(.*?)</script>', res.text, re.DOTALL)
if match:
    data = json.loads(match.group(1))
    print('Found SIGI_STATE')
    try:
        users = data.get('UserModule', {}).get('users', {})
        for k, v in users.items():
            print('Avatar:', v.get('avatarThumb'))
    except Exception as e:
        print('Error:', e)
else:
    print('Not found')
