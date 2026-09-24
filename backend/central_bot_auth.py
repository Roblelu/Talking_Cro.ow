"""Authenticated Eco transport for the VM bot; initialize firebase_admin first.

Requires FIREBASE_WEB_API_KEY, ECO_BOT_UID and CLOUD_FUNCTION_URL in the VM.
Uses the Admin SDK's configured Google identity, not the voice provider key.
Never retries synthesis automatically: an ambiguous timeout may already be billed.
"""
import asyncio
import os
import time
from urllib.parse import urlsplit

import httpx


class EcoBotTransport:
    def __init__(self):
        self._token = None
        self._expires = 0
        self._lock = asyncio.Lock()

    async def _id_token(self, client):
        async with self._lock:
            if self._token and time.monotonic() < self._expires:
                return self._token
            from firebase_admin import auth
            uid = os.environ['ECO_BOT_UID']
            api_key = os.environ['FIREBASE_WEB_API_KEY']
            custom = await asyncio.to_thread(auth.create_custom_token, uid, {'eco_bot': True})
            if isinstance(custom, bytes):
                custom = custom.decode()
            response = await client.post(
                'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken',
                params={'key': api_key},
                json={'token': custom, 'returnSecureToken': True}, timeout=20,
            )
            if response.status_code != 200:
                raise RuntimeError('No se pudo autenticar el servicio Eco.')
            data = response.json()
            self._token = data['idToken']
            self._expires = time.monotonic() + max(0, int(data['expiresIn']) - 120)
            return self._token

    async def send(self, tiktok_username, streamer_uid, message):
        url = os.environ['CLOUD_FUNCTION_URL']
        target = urlsplit(url)
        if target.scheme != 'https' or not target.hostname or not target.hostname.endswith(('.run.app', '.cloudfunctions.net')):
            raise RuntimeError('Destino del servicio Eco inválido.')
        async with httpx.AsyncClient(timeout=150, follow_redirects=False) as client:
            token = await self._id_token(client)
            response = await client.post(url, headers={'Authorization': f'Bearer {token}'}, json={
                'data': {'tiktok_username': tiktok_username, 'streamer_uid': streamer_uid, 'message': message}
            })
            if response.status_code != 200:
                raise RuntimeError(f'El servicio Eco rechazó la solicitud (HTTP {response.status_code}).')
            result = response.json().get('result', {})
            if not result.get('success'):
                raise RuntimeError('El servicio Eco no confirmó la solicitud.')
            return result


_transport = EcoBotTransport()


async def call_tts_cloud_function(tiktok_username, streamer_uid, message):
    """Drop-in replacement for bot_fixed.py's existing async function."""
    try:
        result = await _transport.send(tiktok_username, streamer_uid, message)
        print('Eco censurado con cobro.' if result.get('censored') else 'Eco procesado.')
        return result
    except Exception as error:
        # HTTP exceptions can contain request URLs; do not print credentials/text.
        print(f'No se pudo completar Eco ({type(error).__name__}). Revisar registros del servicio.')
        return None
