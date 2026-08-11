import os
import subprocess
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Talking Cro.ow API")

# Permitir a la UI (Vite) comunicarse
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GiftEvent(BaseModel):
    user: str
    gift_name: str
    message: str = ""

@app.get("/")
def read_root():
    return {"status": "Talking Cro.ow Backend Running"}

@app.post("/api/simulate_gift")
def simulate_gift(event: GiftEvent):
    # TODO: Logica de consulta a SQLite y ejecución de BAT silencioso
    # Este endpoint servirá para probar la UI
    return {"status": "received", "event": event}

# TODO: Archivo de integración con F5-TTS
# TODO: Archivo de integración con TikTokLive WebSocket
