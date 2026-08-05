import os
import json
import sqlite3
import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import threading
import shutil
import uuid
import sys
import httpx
import requests
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent, GiftEvent
from TikTokLive.client.web.web_settings import WebDefaults

# WebDefaults setting for Euler Stream API (Se inicializa dinámicamente)
WebDefaults.sign_api_key = ""

import database
import tts_engine
import secrets

config_path = os.path.join(os.path.dirname(__file__), "config.json")
config_data = {"port": 8763}
if os.path.exists(config_path):
    try:
        with open(config_path, "r") as f:
            config_data = json.load(f)
    except Exception:
        pass

if "api_key" not in config_data:
    config_data["api_key"] = secrets.token_hex(16)
    with open(config_path, "w") as f:
        json.dump(config_data, f, indent=4)

LOCAL_API_KEY = config_data["api_key"]
print(f"\\n{'='*50}\\n🔑 Tu API Key Local es: {LOCAL_API_KEY}\\n{'='*50}\\n")

from fastapi import Depends
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

async def verify_token(api_key: str = Depends(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="Token requerido (Authorization: Bearer <token>)")
    token = api_key.replace("Bearer ", "").strip()
    if token != LOCAL_API_KEY:
        raise HTTPException(status_code=403, detail="Token inválido")
    return token
import tts_engine

app = FastAPI(title="Talking Crow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:8763",
        "http://127.0.0.1:8763",
        "https://talking-crow.web.app",
        "https://talking-crow.firebaseapp.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

class Gift(BaseModel):
    name: str
    trigger_value: str
    script: str

class Settings(BaseModel):
    tiktok_username: str
    base_audio_path: str

@app.on_event("startup")
def startup_event():
    database.init_db()
    # Iniciar carga de F5-TTS en background para no bloquear
    threading.Thread(target=tts_engine.tts_engine.load, daemon=True).start()

tts_queue = None

async def tts_worker_loop():
    while True:
        try:
            if tts_queue is None:
                await asyncio.sleep(1)
                continue
            text_to_speak = await tts_queue.get()
            filename = await tts_engine.tts_engine.generate_file(text_to_speak, None)
            await broadcast_event(LiveEvent(
                type="priority_audio",
                username="XTTS Local",
                message=text_to_speak,
                audio_url=f"http://127.0.0.1:8763/api/audio/{filename}",
                audio_id=filename
            ))
            tts_queue.task_done()
        except Exception as e:
            print(f"Error en TTS Worker: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event_async():
    global tts_queue
    tts_queue = asyncio.Queue()
    asyncio.create_task(tts_worker_loop())

@app.get("/api/gifts", dependencies=[Depends(verify_token)])
def get_gifts():
    conn = database.get_db_connection()
    gifts = conn.execute("SELECT id, name, trigger_value as value, script FROM gifts").fetchall()
    conn.close()
    return [{"id": g["id"], "name": g["name"], "value": g["value"], "script": g["script"]} for g in gifts]

@app.post("/api/gifts", dependencies=[Depends(verify_token)])
def add_gift(gift: Gift):
    conn = database.get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO gifts (name, trigger_value, script) VALUES (?, ?, ?)", 
              (gift.name, gift.trigger_value, gift.script))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"id": new_id, "name": gift.name, "value": gift.trigger_value, "script": gift.script}

@app.delete("/api/gifts/{gift_id}", dependencies=[Depends(verify_token)])
def delete_gift(gift_id: int):
    conn = database.get_db_connection()
    conn.execute("DELETE FROM gifts WHERE id = ?", (gift_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/settings", dependencies=[Depends(verify_token)])
def get_settings():
    conn = database.get_db_connection()
    settings = conn.execute("SELECT tiktok_username, base_audio_path FROM settings LIMIT 1").fetchone()
    conn.close()
    if settings:
        return dict(settings)
    return {"tiktok_username": "@SoyVridel", "base_audio_path": ""}

@app.post("/api/settings", dependencies=[Depends(verify_token)])
def update_settings(settings: Settings):
    conn = database.get_db_connection()
    conn.execute("UPDATE settings SET tiktok_username = ?, base_audio_path = ?", 
                 (settings.tiktok_username, settings.base_audio_path))
    conn.commit()
    conn.close()
    return {"status": "ok"}

class TikTokConnectRequest(BaseModel):
    username: str

active_tiktok_client = None
tiktok_task = None

@app.post("/api/tiktok/connect", dependencies=[Depends(verify_token)])
async def connect_tiktok(req: TikTokConnectRequest):
    global active_tiktok_client, tiktok_task
    
    if active_tiktok_client:
        try:
            await active_tiktok_client.disconnect()
        except:
            pass
        active_tiktok_client = None
        
    try:
        try:
            print("[Sistema] Solicitando clave de firma segura a Web API...")
            # En lugar de hacer una petición insegura a la nube por una llave estática,
            # la leemos desde el config local o entorno (por defecto proporcionamos la de desarrollo).
            euler_key = config_data.get("euler_key", "euler_Y2E0OTVjMDJjNzQyNTNkNmIzZTM4OTU1NjhhNTY1MzUzODdlODlhZDRlODg3MTY1NTc0Mzdi")
            WebDefaults.sign_api_key = euler_key
            print("[Sistema] Clave de firma obtenida de la nube exitosamente.")
        except Exception as e:
            print(f"[Sistema WARNING] Fallo obteniendo llave segura: {e}")
            
        client = TikTokLiveClient(unique_id=req.username)
        active_tiktok_client = client

        async def get_tiktok_avatar(unique_id: str):
            try:
                async with httpx.AsyncClient(timeout=5.0) as c:
                    res = await c.get(f"https://www.tikwm.com/api/user/info?unique_id={unique_id}")
                    data = res.json()
                    if data.get("code") == 0:
                        return data.get("data", {}).get("user", {}).get("avatarThumb")
            except:
                pass
            return None

        @client.on(ConnectEvent)
        async def on_connect(event: ConnectEvent):
            await broadcast_event(LiveEvent(type="connection", username="Sistema", message=f"Conectado a la sala de @{event.unique_id}"))
            try:
                avatar = await get_tiktok_avatar(event.unique_id)
                if not avatar and hasattr(client, 'get_avatar_url'):
                    avatar = await client.get_avatar_url(client.unique_id)
                    
                if avatar:
                    await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=avatar))
                else:
                    await broadcast_event(LiveEvent(type="room_info", username="Sistema", message="/avatar_m.jpg"))
            except Exception as e:
                print("Error sacando avatar", e)
                await broadcast_event(LiveEvent(type="room_info", username="Sistema", message="/avatar_m.jpg"))

        import re
        import unicodedata

        def is_valid_and_clean_message(text: str) -> str:
            if not text:
                return ""
            
            # 1. Eliminar caracteres que no sean letras, números o puntuación básica
            text_cleaned = "".join(c for c in text if unicodedata.category(c).startswith(('L', 'N', 'P', 'Z', 'S')))
            text_cleaned = text_cleaned.strip()
            
            # Ignorar si es demasiado corto o puro emoji (que fue filtrado)
            if len(text_cleaned) < 2:
                return ""
                
            # 2. Normalización Anti-LeetSpeak y eco para comprobación
            leet_map = {'4': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '@': 'a'}
            text_leet = "".join(leet_map.get(c, c) for c in text_cleaned.lower())
            
            # Reducir ecos ("gaaaaveeeer" -> "gaaveer")
            text_reduced = re.sub(r'(.)\1{2,}', r'\1\1', text_leet)
            
            # 3. Lista negra básica (ampliable)
            blacklist = ['gaver', 'puto', 'pendej', 'mierd', 'perra', 'verga', 'vrga', 'mrd', 'puta', 'cabron', 'cabr0n', 'zorra', 'marica']
            for word in blacklist:
                if word in text_reduced:
                    return "" # Bloqueo inmediato
                    
            # Si pasa la muralla, regresamos el texto limpio de basura (con mayúsculas originales)
            final_text = re.sub(r'(.)\1{2,}', r'\1\1', text_cleaned)
            return final_text

        @client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            await broadcast_event(LiveEvent(type="chat", username=event.user.nickname, message=event.comment))
            global tts_global_enabled, tts_queue
            if tts_global_enabled and tts_queue is not None:
                clean_msg = is_valid_and_clean_message(event.comment)
                if clean_msg:
                    text_to_speak = f"{event.user.nickname} dice: {clean_msg}"
                    await tts_queue.put(text_to_speak)
                else:
                    print(f"[Filtro] Mensaje silenciado (Basura/Profanidad): {event.comment}")

        @client.on(GiftEvent)
        async def on_gift(event: GiftEvent):
            try:
                img_url = None
                try:
                    if hasattr(event.gift, "image") and hasattr(event.gift.image, "url_list") and len(event.gift.image.url_list) > 0:
                        img_url = event.gift.image.url_list[0]
                    elif hasattr(event.gift, "icon") and hasattr(event.gift.icon, "url_list") and len(event.gift.icon.url_list) > 0:
                        img_url = event.gift.icon.url_list[0]
                except:
                    pass

                should_broadcast = False
                count = 1
                msg = ""

                if getattr(event.gift, "streakable", False):
                    if not getattr(event, "streaking", False):
                        count = getattr(event, 'repeat_count', 1)
                        msg = f"{count}x {event.gift.name}"
                        should_broadcast = True
                else:
                    msg = f"1x {event.gift.name}"
                    should_broadcast = True

                if should_broadcast:
                    await broadcast_event(LiveEvent(type="gift", username=event.user.nickname, message=msg, img_url=img_url))
            except Exception as e:
                print("Gift parse error:", e)

        async def run_client_safe():
            try:
                # Añadir monitor de timeout para conexiones silenciosas bloqueadas
                async def connection_monitor():
                    await asyncio.sleep(15)
                    if active_tiktok_client and not active_tiktok_client.connected:
                        print(f"[TikTok] Timeout conectando a {req.username}")
                        await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=None))
                        await broadcast_event(LiveEvent(type="connection", username="Sistema", message="TikTok ha bloqueado la conexión a esta sala. Podría tener restricción +18."))
                        await active_tiktok_client.disconnect()
                asyncio.create_task(connection_monitor())
                
                await client.start()
            except Exception as e:
                print(f"[TikTok] Error conectando a {req.username}: {e}")
                await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=None))
                await broadcast_event(LiveEvent(type="connection", username="Sistema", message=f"Error: {e}"))
                global active_tiktok_client
                active_tiktok_client = None

        tiktok_task = asyncio.create_task(run_client_safe())
        return {"status": "conectando", "username": req.username}

    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/tiktok/disconnect", dependencies=[Depends(verify_token)])
async def disconnect_tiktok():
    global active_tiktok_client
    if active_tiktok_client:
        try:
            await active_tiktok_client.disconnect()
        except:
            pass
        active_tiktok_client = None
        await broadcast_event(LiveEvent(type="connection", username="Sistema", message="Desconectado de TikTok Live"))
    return {"status": "desconectado"}

# ---------------------------------------------------------
# Integración de TTS y Moderación
# ---------------------------------------------------------

tts_global_enabled = False

class TTSState(BaseModel):
    enabled: bool

@app.get("/api/tts/state", dependencies=[Depends(verify_token)])
def get_tts_state():
    return {"enabled": tts_global_enabled}

@app.post("/api/tts/state", dependencies=[Depends(verify_token)])
def set_tts_state(state: TTSState):
    global tts_global_enabled
    tts_global_enabled = state.enabled
    return {"status": "ok", "enabled": tts_global_enabled}



from fastapi.responses import FileResponse

@app.get("/api/audio/{filename}")
def get_audio(filename: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    audio_path = os.path.join(base_dir, "audio_queue", filename)
    if os.path.exists(audio_path):
        media = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"
        return FileResponse(audio_path, media_type=media)
    return {"status": "error", "message": "File not found"}

@app.delete("/api/audio/{filename}")
def delete_audio(filename: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    audio_path = os.path.join(base_dir, "audio_queue", filename)
    if os.path.exists(audio_path):
        try:
            os.remove(audio_path)
            return {"status": "ok"}
        except:
            return {"status": "error"}
    return {"status": "ok"}

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")



# Memoria temporal para la moderación
pending_comments = {}

class TextDonation(BaseModel):
    username: str
    comment: str
    audio_id: Optional[str] = None

@app.post("/api/moderation/text_queue", dependencies=[Depends(verify_token)])
def queue_text_donation(donation: TextDonation):
    token = str(uuid.uuid4())
    pending_comments[token] = {
        "id": token,
        "username": donation.username,
        "comment": donation.comment,
        "audio_id": donation.audio_id,
        "status": "pending"
    }
    return {"status": "ok", "id": token}

@app.get("/api/moderation/queue", dependencies=[Depends(verify_token)])
def get_moderation_queue():
    # Devuelve todos los pendientes
    items = [v for v in pending_comments.values() if v["status"] == "pending"]
    return {"items": items}

@app.post("/api/moderation/approve/{token}", dependencies=[Depends(verify_token)])
async def approve_text(token: str):
    if token in pending_comments:
        donation = pending_comments[token]
        donation["status"] = "approved"
        text_to_speak = f"{donation['username']} dice: {donation['comment']}"
        global tts_queue
        if tts_queue is not None:
            asyncio.create_task(tts_queue.put(text_to_speak))
        
        return {"status": "ok", "message": "Enviado a síntesis"}
    return {"status": "error", "message": "No encontrado"}

@app.post("/api/moderation/reject/{token}", dependencies=[Depends(verify_token)])
def reject_text(token: str):
    if token in pending_comments:
        pending_comments[token]["status"] = "rejected"
    return {"status": "ok"}



@app.post("/api/shutdown", dependencies=[Depends(verify_token)])
def shutdown_server():
    import os
    import subprocess
    print("Recibida señal de apagado. Deteniendo Talking Crow...")
    
    # Ejecutar kill_all.bat de forma independiente
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kill_script = os.path.join(base_dir, "kill_all.bat")
    
    if os.path.exists(kill_script):
        subprocess.Popen(["cmd.exe", "/c", kill_script], creationflags=subprocess.CREATE_NEW_CONSOLE | 0x08000000)
    else:
        os._exit(0)
        
    return {"status": "shutting_down"}



# ---------------------------------------------------------
# SSE - Live Monitor (React)
# ---------------------------------------------------------
from fastapi.responses import StreamingResponse

sse_clients = []

@app.get("/api/live_events")
async def sse_live_events():
    queue = asyncio.Queue()
    sse_clients.append(queue)
    
    async def event_stream():
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if queue in sse_clients:
                sse_clients.remove(queue)
                
    return StreamingResponse(event_stream(), media_type="text/event-stream")

class LiveEvent(BaseModel):
    type: str
    username: str
    message: Optional[str] = None
    img_url: Optional[str] = None
    audio_url: Optional[str] = None
    audio_id: Optional[str] = None

@app.post("/api/internal/broadcast", dependencies=[Depends(verify_token)])
async def broadcast_event(event: LiveEvent):
    for q in sse_clients:
        await q.put({
            "type": event.type, 
            "username": event.username, 
            "message": event.message, 
            "img_url": event.img_url,
            "audio_url": getattr(event, "audio_url", None),
            "audio_id": getattr(event, "audio_id", None)
        })
    return {"status": "ok"}

# ---------------------------------------------------------
# Montaje del Frontend (React SPA)
# ---------------------------------------------------------

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Proteger rutas API para que no sean tragadas por el catch-all
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    safe_dist = os.path.abspath(frontend_dist)
    requested_path = os.path.abspath(os.path.join(frontend_dist, full_path))
    
    # TC-07: Bloquear Path Traversal
    if not requested_path.startswith(safe_dist):
        raise HTTPException(status_code=403, detail="Forbidden: Path Traversal attempt")
    
    # Si el archivo existe directamente (ej. assets/algo.css), sírvelo.
    if os.path.exists(requested_path) and os.path.isfile(requested_path):
        return FileResponse(requested_path)
        
    # Si no, devuelve el index.html de React para que el Router del lado del cliente se encargue
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    # Si todavía no hay build de React, mostramos mensaje amigable
    return {"message": "Talking Crow Backend is running. Please build the frontend."}

if __name__ == "__main__":
    import uvicorn
    # Leer config
    config_path = os.path.join(os.path.dirname(__file__), "config.json")
    port = 8763
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                cfg = json.load(f)
                port = cfg.get("port", port)
        except Exception as e:
            print("Error leyendo config.json:", e)

    print(f"Iniciando Servidor Unificado de Talking Crow en el puerto: {port}")
    uvicorn.run(app, host="127.0.0.1", port=port)
