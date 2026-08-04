import threading
import subprocess
import time
import re
import urllib.request
import os

public_url = None
cloudflared_process = None

def start_tunnel(port=8763):
    global public_url, cloudflared_process
    
    exe_name = "cloudflared.exe"
    if not os.path.exists(exe_name):
        print("[TUNNEL] Descargando Cloudflared (firmado oficial) para evitar Windows Defender...")
        try:
            url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
            urllib.request.urlretrieve(url, exe_name)
        except Exception as e:
            print(f"[TUNNEL] Error descargando Cloudflared: {e}")
            public_url = None
            return

    print(f"[TUNNEL] Iniciando Cloudflared Tunnel en el puerto {port}...")
    try:
        # cloudflared escupe logs a STDERR, no stdout
        # CREATE_NO_WINDOW es 0x08000000 para evitar que salte una consola negra
        cloudflared_process = subprocess.Popen(
            [f".\\{exe_name}", "tunnel", "--url", f"http://127.0.0.1:{port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            creationflags=0x08000000
        )
        
        def read_logs():
            global public_url
            for line in cloudflared_process.stderr:
                # Buscar el link de trycloudflare
                match = re.search(r'https://[-a-zA-Z0-9]+\.trycloudflare\.com', line)
                if match:
                    public_url = match.group(0)
                    print(f"[TUNNEL] Cloudflare Tunnel abierto! URL Pública: {public_url}")
                    break
        
        threading.Thread(target=read_logs, daemon=True).start()
    except Exception as e:
        print(f"[TUNNEL] Error al iniciar Cloudflared: {e}")
        public_url = None

def get_public_url():
    return public_url

def stop_tunnel():
    global cloudflared_process
    if cloudflared_process:
        cloudflared_process.terminate()
        cloudflared_process = None
        print("[TUNNEL] Cloudflare Tunnel cerrado.")
