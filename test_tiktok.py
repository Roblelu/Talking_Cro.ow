import urllib.request

req = urllib.request.Request(
    'https://www.tiktok.com/@mrbeast',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    }
)
try:
    html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
    print('HTML START:', html[:500])
except Exception as e:
    print('ERROR:', e)
