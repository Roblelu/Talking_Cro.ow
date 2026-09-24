# Integración del bot central (pendiente de aplicar en la VM)

1. Respaldar `/home/cnkrxdu/bot_fixed.py` antes de modificarlo. No reemplazar el bot por `backend_central/bot.py`: son versiones diferentes.
2. Copiar `central_bot_auth.py` junto a `bot_fixed.py`. El entorno Python necesita `firebase-admin` y `httpx`, ya utilizados por el bot.
3. Sustituir únicamente la definición antigua de `call_tts_cloud_function` por `from central_bot_auth import call_tts_cloud_function`. Mantener la inicialización de Firebase Admin y los listeners existentes.
4. Configurar en la VM `ECO_BOT_UID=talking-crow-central-bot`, `FIREBASE_WEB_API_KEY` (clave pública del proyecto Firebase) y `CLOUD_FUNCTION_URL` con la URL verificada de processTTSMessage. Eliminar el uso de CENTRAL_SERVER_SECRET.
5. Configurar el mismo ECO_BOT_UID en Functions. El bot crea un custom token con claim eco_bot y lo intercambia por un ID token; nunca enviar directamente el custom token como Bearer. Recomendación: cuenta de servicio dedicada asociada a la VM, sin archivo privado descargado, con permisos mínimos para leer las colecciones necesarias y firmar tokens. Comprobar permisos de firma antes de reiniciar.
6. Desplegar processTTSMessage, testClonedVoiceWeb y filterTTSMessage juntos con GEMINI_API_KEY y el modelo configurados. Verificar la credencial de voces por separado: autenticar el bot no arregla un rechazo del proveedor.
7. Reiniciar mediante el mecanismo supervisor real una vez identificado. Probar allow, soften y block: block cobra sin audio; fallo técnico de moderación no cobra. Confirmar saldos y registros, no solo HTTP 200.

No aplicado ni probado contra producción. No reintentar automáticamente mensajes tras timeout: falta idempotencia basada en el ID de comentario para evitar cobros duplicados. El escritorio y el bot pueden observar el mismo comentario; antes de habilitar ambos como emisores hay que seleccionar un único emisor o implementar deduplicación compartida. Los cambios actuales conservan las comisiones existentes también para censuras, pero no las contabilizan como audios reproducidos.
