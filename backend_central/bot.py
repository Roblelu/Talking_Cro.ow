import os
import sys
import asyncio
import httpx
import json
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, DisconnectEvent, CommentEvent
from TikTokLive.client.errors import UserOfflineError

import firebase_admin
from firebase_admin import credentials, firestore

# --- Configuración Base ---
# Usar credenciales de servicio (si están disponibles) o default (para GCP)
# En producción (Cloud Run), se usa initialize_app() sin creds.
try:
    cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), 'firebase-service-account.json'))
    firebase_admin.initialize_app(cred)
    print("[Firebase] Inicializado con Service Account local.")
except FileNotFoundError:
    print("[Firebase] Service Account no encontrado. Intentando inicializar con credenciales default de GCP...")
    firebase_admin.initialize_app()

db = firestore.client()

# --- Variables Globales ---
# Diccionario de clientes activos: { streamer_uid: { "client": TikTokLiveClient, "task": asyncio.Task, "tiktok_username": str } }
active_streams = {}

# Variables de Entorno
# En producción, esto debe estar en las variables de entorno de GCP
CLOUD_FUNCTION_URL = os.environ.get("CLOUD_FUNCTION_URL", "https://us-central1-talking-crow.cloudfunctions.net/processTTSMessage")
CENTRAL_SERVER_SECRET = os.environ.get("CENTRAL_SERVER_SECRET", "dev_secret_12345")

# --- Lógica del Bot ---
def is_valid_eco_command(text: str) -> bool:
    """Verifica si el comentario es un comando Eco Voice (ignora mayúsculas/minúsculas)."""
    return text.lower().strip().startswith("eco ")

def extract_eco_message(text: str) -> str:
    """Extrae el mensaje del comando Eco Voice."""
    return text[4:].strip()

async def call_tts_cloud_function(tiktok_username: str, streamer_uid: str, message: str):
    """Llama a la Cloud Function processTTSMessage de Firebase."""
    payload = {
        "data": {
            "tiktok_username": tiktok_username,
            "streamer_uid": streamer_uid,
            "message": message,
            "server_secret": CENTRAL_SERVER_SECRET
        }
    }
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(CLOUD_FUNCTION_URL, json=payload, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("result", {}).get("success"):
                    print(f"[TTS Success] Enviado a {tiktok_username} -> {streamer_uid}")
                else:
                    print(f"[TTS Error] Función retornó error: {result}")
            else:
                print(f"[TTS Error] Status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[TTS Exception] Error al contactar Firebase CF: {e}")

async def start_tiktok_listener(streamer_uid: str, tiktok_username: str):
    """Inicia el cliente de TikTokLive para un streamer específico."""
    client = TikTokLiveClient(unique_id=tiktok_username)

    @client.on(ConnectEvent)
    async def on_connect(event: ConnectEvent):
        print(f"[TikTok] ({streamer_uid}) Conectado a la sala de @{event.unique_id}")

    @client.on(DisconnectEvent)
    async def on_disconnect(event: DisconnectEvent):
        print(f"[TikTok] ({streamer_uid}) Desconectado.")
        # La reconexión automática es manejada por TikTokLive si el streamer sigue vivo,
        # Si queremos cerrarlo, se maneja desde el listener de Firestore.

    @client.on(CommentEvent)
    async def on_comment(event: CommentEvent):
        comment = event.comment
        if is_valid_eco_command(comment):
            message = extract_eco_message(comment)
            chatter_username = event.user.unique_id # El username en TikTok del espectador
            
            print(f"[Eco Detectado] {chatter_username} en stream de {streamer_uid}: {message}")
            
            # Disparar tarea en background para no bloquear el loop del chat
            asyncio.create_task(call_tts_cloud_function(
                tiktok_username=chatter_username,
                streamer_uid=streamer_uid,
                message=message
            ))

    try:
        print(f"[Bot] Iniciando conexión para @{tiktok_username} ({streamer_uid})...")
        await client.start()
    except UserOfflineError:
        print(f"[Bot Error] El usuario @{tiktok_username} está offline.")
    except Exception as e:
        print(f"[Bot Error] Error en stream de @{tiktok_username}: {e}")
    finally:
        # Limpieza si el cliente termina
        if streamer_uid in active_streams:
            del active_streams[streamer_uid]
        print(f"[Bot] Tarea terminada para {streamer_uid}.")

# --- Listener de Firestore ---
def on_active_streams_snapshot(col_snapshot, changes, read_time):
    """Callback de Firestore cuando cambia la colección de streams activos."""
    print(f"[Firestore] Cambios detectados en streams activos. Procesando...")
    
    # 1. Recopilar IDs activos en Firestore
    current_firestore_uids = set()
    for doc in col_snapshot:
        current_firestore_uids.add(doc.id)
        data = doc.to_dict()
        tiktok_username = data.get("tiktok_username")
        
        # Si el streamer no está siendo escuchado por el bot, lo arrancamos
        if doc.id not in active_streams and tiktok_username:
            # Validación de Seguridad Anti-Robo de Streams
            # Verificamos que el UID realmente sea dueño de ese tiktok_username en su perfil
            user_doc = db.collection('users').doc(doc.id).get()
            if not user_doc.exists or user_doc.to_dict().get('tiktok_username') != tiktok_username:
                print(f"[Seguridad] Intento de Robo de Stream detectado: UID {doc.id} intentó escuchar a @{tiktok_username}. Bloqueado.")
                continue

            task = asyncio.create_task(start_tiktok_listener(doc.id, tiktok_username))
            active_streams[doc.id] = {
                "client": None, # Se asigna dentro de la tarea
                "task": task,
                "tiktok_username": tiktok_username
            }
            
    # 2. Detener escuchas de streamers que ya no están en Firestore
    uids_to_stop = []
    for uid in list(active_streams.keys()):
        if uid not in current_firestore_uids:
            uids_to_stop.append(uid)
            
    for uid in uids_to_stop:
        stream_data = active_streams[uid]
        print(f"[Bot] Deteniendo escucha para {uid} (@{stream_data['tiktok_username']})")
        stream_data["task"].cancel()
        del active_streams[uid]

async def firestore_listener_loop():
    """Mantiene vivo el programa y gestiona el listener de Firestore."""
    col_ref = db.collection("active_streams")
    # Configurar el snapshot listener en un hilo secundario (manejado por el SDK)
    watch = col_ref.on_snapshot(on_active_streams_snapshot)
    
    print("[Sistema] Bot Central Iniciado. Escuchando 'active_streams' en Firestore...")
    
    try:
        while True:
            await asyncio.sleep(3600) # Mantener vivo el event loop principal
    except asyncio.CancelledError:
        watch.unsubscribe()
        print("[Sistema] Apagando Bot Central...")

if __name__ == "__main__":
    try:
        asyncio.run(firestore_listener_loop())
    except KeyboardInterrupt:
        print("Bot interrumpido por el usuario.")
