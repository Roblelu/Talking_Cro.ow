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
import stripe
import httpx
import requests
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, CommentEvent, GiftEvent
from TikTokLive.client.web.web_settings import WebDefaults

# WebDefaults setting for Euler Stream API (Se inicializa dinámicamente)
WebDefaults.sign_api_key = ""

stripe.api_key = "sk_test_51TyM9BE4bMtk8o6NN86idlHXaWSEjTnWjXB7zU26LRTYcydiXSUWQtwNpaz8do6QzRxqDBsnl7kGKP6qA1VYfOae00qREwnJ9x"

import database
import tunnel
import tts_engine

app = FastAPI(title="Talking Crow API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    # Iniciar túnel Ngrok en background
    threading.Thread(target=tunnel.start_tunnel, args=(8763,), daemon=True).start()
    # Iniciar carga de F5-TTS en background para no bloquear
    threading.Thread(target=tts_engine.tts_engine.load, daemon=True).start()

@app.get("/api/gifts")
def get_gifts():
    conn = database.get_db_connection()
    gifts = conn.execute("SELECT id, name, trigger_value as value, script FROM gifts").fetchall()
    conn.close()
    return [{"id": g["id"], "name": g["name"], "value": g["value"], "script": g["script"]} for g in gifts]

@app.post("/api/gifts")
def add_gift(gift: Gift):
    conn = database.get_db_connection()
    c = conn.cursor()
    c.execute("INSERT INTO gifts (name, trigger_value, script) VALUES (?, ?, ?)", 
              (gift.name, gift.trigger_value, gift.script))
    conn.commit()
    new_id = c.lastrowid
    conn.close()
    return {"id": new_id, "name": gift.name, "value": gift.trigger_value, "script": gift.script}

@app.delete("/api/gifts/{gift_id}")
def delete_gift(gift_id: int):
    conn = database.get_db_connection()
    conn.execute("DELETE FROM gifts WHERE id = ?", (gift_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}

@app.get("/api/settings")
def get_settings():
    conn = database.get_db_connection()
    settings = conn.execute("SELECT tiktok_username, base_audio_path FROM settings LIMIT 1").fetchone()
    conn.close()
    if settings:
        return dict(settings)
    return {"tiktok_username": "@SoyVridel", "base_audio_path": ""}

@app.post("/api/settings")
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

@app.post("/api/tiktok/connect")
async def connect_tiktok(req: TikTokConnectRequest):
    global active_tiktok_client, tiktok_task
    
    if active_tiktok_client:
        try:
            await active_tiktok_client.disconnect()
        except:
            pass
        active_tiktok_client = None
        
    try:
        # 0. Solicitar clave segura de Euler Stream a nuestra Web API (Firebase)
        try:
            print("[Sistema] Solicitando clave de firma segura a Web API...")
            api_res = requests.post(
                "http://127.0.0.1:5001/talking-crow/us-central1/getEulerKey", 
                json={"username": req.username},
                timeout=5
            )
            if api_res.status_code == 200:
                key_data = api_res.json()
                if "key" in key_data:
                    WebDefaults.sign_api_key = key_data["key"]
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
                # Intentar sacar la imagen del streamer con tikwm API
                avatar = await get_tiktok_avatar(event.unique_id)
                if avatar:
                    await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=avatar))
                else:
                    if hasattr(client, 'get_avatar_url'):
                        avatar2 = await client.get_avatar_url(client.unique_id)
                        if avatar2:
                            await broadcast_event(LiveEvent(type="room_info", username="Sistema", message=avatar2))
            except Exception as e:
                print("Error sacando avatar", e)

        @client.on(CommentEvent)
        async def on_comment(event: CommentEvent):
            await broadcast_event(LiveEvent(type="chat", username=event.user.nickname, message=event.comment))
            
            global tts_global_enabled
            if tts_global_enabled:
                text_to_speak = f"{event.user.nickname} dice: {event.comment}"
                asyncio.create_task(tts_engine.tts_engine.generate_and_play(text_to_speak, None))

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
                    
                    global tts_global_enabled
                    if tts_global_enabled:
                        text_to_speak = f"{event.user.nickname} ha enviado {msg}"
                        # Lanza la síntesis en background sin bloquear la recepción de eventos
                        asyncio.create_task(tts_engine.tts_engine.generate_and_play(text_to_speak, None))
            except Exception as e:
                print("Gift parse error:", e)

        # Iniciar asíncronamente (client.start() corre indefinidamente, ideal para tasks)
        tiktok_task = asyncio.create_task(client.start())
        return {"status": "conectando", "username": req.username}

    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/tiktok/disconnect")
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

@app.get("/api/tts/state")
def get_tts_state():
    return {"enabled": tts_global_enabled}

@app.post("/api/tts/state")
def set_tts_state(state: TTSState):
    global tts_global_enabled
    tts_global_enabled = state.enabled
    return {"status": "ok", "enabled": tts_global_enabled}

@app.get("/api/moderation/link")
def get_moderation_link():
    import tunnel
    url = tunnel.get_public_url()
    if url:
        return {"status": "ok", "url": f"{url}/grabar/TEST_ID"}
    else:
        return {"status": "error", "message": "El túnel seguro de Cloudflare está iniciando, inténtalo de nuevo en 5 segundos."}
    
    token = str(uuid.uuid4())
    # Aquí registraríamos el token en la BD (exclusivo y expira en 2h)
    return {"status": "ok", "url": f"{public_url}/grabar/{token}"}

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

@app.get("/grabar/{token}")
def serve_muro_donador(token: str):
    path = os.path.join(frontend_dist, "muro_donador.html")
    if os.path.exists(path):
        return FileResponse(path)
    public_path = os.path.join(os.path.dirname(frontend_dist), "public", "muro_donador.html")
    if os.path.exists(public_path):
        return FileResponse(public_path)
    raise HTTPException(status_code=404, detail="Página no encontrada")

# Memoria temporal para la moderación
pending_comments = {}

class TextDonation(BaseModel):
    username: str
    comment: str
    audio_id: Optional[str] = None

@app.post("/api/moderation/text_queue")
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

@app.get("/api/moderation/queue")
def get_moderation_queue():
    # Devuelve todos los pendientes
    items = [v for v in pending_comments.values() if v["status"] == "pending"]
    return {"items": items}

@app.post("/api/moderation/approve/{token}")
def approve_text(token: str, background_tasks: BackgroundTasks):
    if token in pending_comments:
        donation = pending_comments[token]
        donation["status"] = "approved"
        
        # Aquí lanzaremos el TTS en background
        text_to_speak = f"{donation['username']} dice: {donation['comment']}"
        
        audio_path = None
        if donation.get("audio_id"):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            audio_path = os.path.join(base_dir, "audio_queue", f"{donation['audio_id']}.wav")
            
        background_tasks.add_task(tts_engine.tts_engine.generate_and_play, text_to_speak, audio_path)
        
        return {"status": "ok", "message": "Enviado a síntesis"}
    return {"status": "error", "message": "No encontrado"}

@app.post("/api/moderation/reject/{token}")
def reject_text(token: str):
    if token in pending_comments:
        pending_comments[token]["status"] = "rejected"
    return {"status": "ok"}

@app.post("/api/moderation/upload")
async def upload_moderation_audio(audio: UploadFile = File(...)):
    # Carpeta absoluta para guardar los audios generados
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    AUDIO_QUEUE_DIR = os.path.join(BASE_DIR, "audio_queue")
    os.makedirs(AUDIO_QUEUE_DIR, exist_ok=True)
    
    token = str(uuid.uuid4())
    file_path = os.path.join(AUDIO_QUEUE_DIR, f"{token}.wav")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    return {"status": "ok", "audio_id": token, "message": "Audio recibido y guardado localmente."}

@app.post("/api/shutdown")
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
# Pasarela de Pagos (Stripe)
# ---------------------------------------------------------
class PaymentRequest(BaseModel):
    tiktok_username: str
    amount: int # en centavos
    
@app.post("/api/stripe/create-payment-intent")
async def create_payment_intent(req: PaymentRequest):
    try:
        # Crea un PaymentIntent por $4.99 USD
        intent = stripe.PaymentIntent.create(
            amount=req.amount,
            currency="usd",
            metadata={"tiktok_username": req.tiktok_username}
        )
        return {"client_secret": intent.client_secret}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    message: str
    img_url: Optional[str] = None

@app.post("/api/internal/broadcast")
async def broadcast_event(event: LiveEvent):
    for q in sse_clients:
        await q.put({"type": event.type, "username": event.username, "message": event.message, "img_url": event.img_url})
    return {"status": "ok"}

# ---------------------------------------------------------
# Montaje del Frontend (React SPA)
# ---------------------------------------------------------

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # Proteger rutas API para que no sean tragadas por el catch-all
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    path = os.path.join(frontend_dist, full_path)
    
    # Si el archivo existe directamente (ej. assets/algo.css), sírvelo.
    if os.path.exists(path) and os.path.isfile(path):
        return FileResponse(path)
        
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
