# Registro de seguridad y deuda técnica — Talking Cro.ow

Última revisión: **2026-08-13**  
Alcance: código local de la app Electron/FastAPI, web React, Cloud Functions, reglas de Firestore y scripts de operación.  
Esta revisión **no desplegó cambios**, no ejecutó pruebas intrusivas contra producción y no puede garantizar ausencia absoluta de vulnerabilidades.

## Leyenda

| Estado | Significado |
|---|---|
| ✅ Corregido localmente | El código fue modificado y pasó las verificaciones indicadas al final. |
| 🛡️ Mitigado localmente | El flujo riesgoso quedó cerrado o limitado; falta el diseño definitivo. |
| 🟡 Parcial | Se corrigió una parte, pero queda trabajo técnico, migración o despliegue. |
| ⏳ Pendiente | No se modificó porque requiere una decisión de producto, migración, infraestructura o cambio de alto impacto. |
| 🌐 Externo | Depende de producción, rotación de credenciales o configuración fuera del repositorio. |

> **Advertencia de release:** `firebase_deploy.bat` usa `--only hosting`. En su estado actual no publica `web/firestore.rules` ni `web/functions`. Ningún arreglo de nube descrito aquí protege producción hasta desplegar esos recursos de forma controlada.

## Aplicación de escritorio y backend local

| ID | Hallazgo | Riesgo | Estado | Acción realizada / pendiente |
|---|---|---:|---|---|
| TC-04 | Path traversal en lectura y borrado de audio | Alto | ✅ Corregido localmente | Las rutas se resuelven con `Path.resolve()` y `relative_to()`, se rechazan nombres con directorios y se permiten solo extensiones conocidas. `DELETE` exige token. |
| TC-09 | Electron con `nodeIntegration`, sin aislamiento y con `webviewTag` | Alto | ✅ Corregido localmente | `nodeIntegration: false`, `contextIsolation: true`, `webviewTag: false`; ventanas emergentes externas denegadas. |
| TC-12 | Cola TTS sin límite | Alto | ✅ Corregido localmente | `asyncio.Queue(maxsize=100)`, respuesta 429 al llenarse y `task_done()` garantizado. |
| TC-15 | Eventos del directo expuestos sin autenticación | Medio | ✅ Corregido localmente | `/api/live_events` y `/api/internal/broadcast` exigen la credencial local; Electron la añade desde el proceso principal. |
| TC-17 | Contención incorrecta de rutas de la SPA | Medio | ✅ Corregido localmente | Se sustituyó `startswith` por comprobación estructural con `Path.relative_to()`. |
| TC-20 | API key local impresa, versionada y almacenada en el renderer | Medio | ✅ Corregido localmente | Se genera un secreto de 256 bits en `backend/local_config.json`, ignorado por Git; ya no se imprime ni se entrega a `localStorage`. |
| TC-26 | Cola de overlay sin autenticación ni límite | Medio | ✅ Corregido localmente | `push` exige token, valida tipo/URL/volumen y la cola tiene máximo de 100 eventos. `pop` sigue público por compatibilidad con OBS. |
| TC-27 | Subida de medios duplicada, sin límite y con nombre controlado por el cliente | Alto | ✅ Corregido localmente | Quedó una sola ruta autenticada; límite de 10 MB, lista de MIME/extensiones y nombre UUID generado por servidor. |
| TC-28 | Cola de moderación creciendo indefinidamente | Medio | ✅ Corregido localmente | Máximo de 500 entradas; aprobadas y rechazadas se eliminan; entradas y texto tienen límites. |
| TC-29 | Colas SSE por cliente sin límite | Medio | ✅ Corregido localmente | Máximo de 100 eventos por cliente; al llenarse se descarta el más antiguo. |
| TC-39 | Reproducción TTS iniciada antes de confirmar el consumo de crédito | Medio | ✅ Corregido localmente | La app espera `consumeTTSCredit`; si el cobro falla, no reproduce. |
| TC-40 | Recargar/cerrar una vista podía apagar el backend | Medio | ✅ Corregido localmente | Se eliminó el `sendBeacon` de `beforeunload`; el apagado se gestiona desde Electron con token y una única secuencia. |
| TC-41 | Un monitor de conexión TikTok anterior podía desconectar un intento nuevo | Medio | ✅ Corregido localmente | Cada monitor conserva la instancia exacta de cliente que debe observar/desconectar. |
| TC-42 | `kill_all.bat` terminaba todos los procesos Node, Python, Chrome y Electron del equipo | Alto operativo | ✅ Corregido localmente | Ahora limita la terminación a procesos cuyo título pertenece a Talking Crow. |
| TC-43 | IPC de ventanas secundarias aceptaba rutas arbitrarias y remitentes no verificados | Alto | ✅ Corregido localmente | Remitente validado, rutas en allowlist, ventanas deduplicadas y navegación emergente denegada. |
| TC-45 | Parámetros locales de TTS y settings sin límites estrictos | Medio | ✅ Corregido localmente | Voces permitidas, porcentaje de velocidad/volumen, tamaños de texto/usuario y flags validados. |
| TC-46 | Archivos runtime de medios podían entrar al repositorio | Medio privacidad | ✅ Corregido localmente | `backend/media/`, `backend/media_uploads/`, audio, base SQLite y configuración local quedan ignorados. |
| TC-51 | Medios locales no tienen cuota total, expiración ni limpieza automática | Medio | ⏳ Pendiente | Un usuario legítimo o fallo repetitivo puede llenar disco con archivos válidos de hasta 10 MB. Requiere política de retención y cuota. |
| TC-52 | Uso de `@app.on_event` obsoleto | Bajo | ⏳ Pendiente | No es una vulnerabilidad directa. Migrar a `lifespan` toca inicialización, trabajador TTS y cierre; se evitó por riesgo de regresión. |
| TC-53 | Lectura pública de audio/media y `overlay/pop` en localhost | Bajo–Medio | ⏳ Pendiente | Es necesaria para OBS/browser source actual. Para cerrarla se requiere una URL efímera o token compatible con OBS. |
| TC-55 | Subida manual de voz en la cuenta de Electron es un cascarón | Bajo funcional | ⏳ Pendiente | El selector solo muestra un aviso; la grabadora sí tiene lógica. No se fingió una implementación durante el parche de seguridad. |

## Página web, Firebase y pagos

| ID | Hallazgo | Riesgo | Estado | Acción realizada / pendiente |
|---|---|---:|---|---|
| TC-01 | Manipulación de saldos o privilegios desde Firestore cliente | Crítico | ✅ Corregido localmente | Reglas con esquema estricto: saldos/privilegios nacen en cero y el cliente solo puede modificar `tiktok_username`. También se retiraron botones de recarga DEV basados en correo. |
| TC-02 | Precio, cantidad y beneficiario del pago controlados por el navegador | Crítico | ✅ Corregido localmente | El servidor usa catálogo `PACKAGES`, UID autenticado y valida paquete, moneda y monto recibido en el webhook. |
| TC-03 | Reglas de Firestore no conectadas al proyecto de Hosting | Alto | 🟡 Parcial | `web/firebase.json` ya apunta a `firestore.rules`, pero el script de release solo despliega Hosting. Falta publicar reglas explícitamente. |
| TC-05 | Webhook de Stripe sin idempotencia | Alto | ✅ Corregido localmente | `event.id` se registra dentro de una transacción antes de acreditar. |
| TC-06 | Stripe recibía 200 aunque Firestore fallara | Alto | ✅ Corregido localmente | Los fallos de base responden 500 para que Stripe reintente. |
| TC-07 | Creación pública/automatizable de PaymentIntents | Alto | 🟡 Parcial | Ahora exige Firebase Auth y paquete válido. Falta App Check/rate limiting para abuso con cuentas automatizadas. |
| TC-08 | Secretos incrustados en código y configuración versionada | Alto | 🟡 Parcial / 🌐 | El árbol actual ya no contiene las claves revisadas y los tests usan variables/config local. Falta rotar todas las credenciales expuestas y, si se requiere, limpiar historial Git. |
| TC-10 | Modelo antiguo de PII y documentos por username | Alto | 🟡 Parcial | Nuevos registros usan UID y subdocumento privado. Los datos históricos siguen sujetos a TC-19. |
| TC-11 | Colisión/suplantación de usernames | Alto | ✅ Corregido localmente | Reserva `usernames/{username}` y perfil se crean en batch; reglas exigen documento inexistente y UID propio; cambios pasan por transacción de servidor. |
| TC-13 | Tienda incompatible con reglas autenticadas | Alto funcional | ✅ Corregido localmente | Rutas de tienda son privadas y las Functions derivan el UID de Auth. |
| TC-14 | Flujo de pagos mal enrutado o bundle distinto al código | Alto funcional | 🟡 Parcial | Código y builds locales son coherentes; no se verificó el bundle ni las Functions desplegadas en producción. |
| TC-16 | Lectura masiva de perfiles | Medio | ✅ Corregido localmente | Cada usuario solo puede leer su documento y subdocumento privado. |
| TC-18 | CSP y encabezados incompletos | Medio | ✅ local / 🌐 pendiente | Configurados CSP, anti-frame, nosniff, referrer, permissions y HSTS. Falta despliegue/verificación HTTP en producción. |
| TC-19 | Cuentas heredadas sin migración UID/PII | Medio–Alto | ⏳ Pendiente | Requiere respaldo, inventario y migración idempotente con Admin SDK; no se ejecutó una migración destructiva. |
| TC-21 | Datos enviados a TTS de terceros sin evidencia de consentimiento | Medio privacidad | 🟡 Parcial | Nuevos registros exigen consentimiento y guardan versión/fecha/método. Falta obtener o registrar consentimiento de cuentas existentes y definir retención del proveedor. |
| TC-22 | Dependencias con `uuid < 11.1.1` | Medio | ⏳ Pendiente | **No es falso positivo actualmente:** `npm audit` reportó 8 avisos moderados transitivos en Functions. La corrección propuesta sube `firebase-admin` a una major breaking; no se aplicó `--force`. App y web reportaron 0. |
| TC-23 | Parseo permisivo de `Authorization` local | Bajo | ✅ Corregido localmente | Se normaliza Bearer de forma insensible a mayúsculas y se elimina whitespace. |
| TC-24 | Producción puede servir un despliegue anterior | Medio operativo | 🌐 Pendiente | Se generaron builds locales correctos; no se desplegó ni se comparó el hash servido por producción. |
| TC-25 | Función de migración pública/antigua | Crítico | ✅ Corregido localmente | `migrateLegacyUsers` fue retirada de las Functions exportadas. |
| TC-30 | Inyección de campos nuevos mediante updates Firestore | Alto | ✅ Corregido localmente | `diff().affectedKeys().hasOnly(['tiktok_username'])` y esquema cerrado en creación. |
| TC-31 | `processTTSMessage` permitía que el streamer eligiera qué cuenta TikTok pagaba | Crítico | 🛡️ Mitigado localmente | El precio ya no viene del cliente; el cliente evita llamar la Function y el servidor también rechaza el flujo premium. Falta una prueba firmada que vincule evento TikTok ↔ usuario Firebase y una operación idempotente por evento. |
| TC-32 | Retiro Stripe ejecutado dentro de una transacción reintentable | Crítico financiero | 🛡️ Mitigado localmente | `requestPayout` queda deshabilitada. Falta ledger, idempotency key, estados de retiro y reconciliación por webhook. |
| TC-33 | `consumeFeature` aceptaba feature/precio del navegador | Alto | 🛡️ Mitigado localmente | Función cerrada hasta contar con catálogo de servidor y consumidores reales. |
| TC-34 | Créditos gratis por rutas antiguas de Login o botones DEV | Alto | ✅ Corregido localmente | Login ya no crea perfiles; cuentas nuevas pasan por Registro, saldos nacen en cero y la recarga por correos fue eliminada. |
| TC-35 | Formulario de cambio de contraseña era simulado | Alto cuenta | ✅ Corregido localmente | Reautenticación Firebase real, verificación de proveedor, mínimo y confirmación; no se registra contraseña en consola. |
| TC-36 | Clonado de voz con payload inconsistente, sin límites y errores fuera del `catch` | Alto abuso/costo | 🟡 Parcial | Payload unificado, MIME/base64/tamaño máximo 10 MB, nombre controlado por servidor, `maxInstances` y cooldown de 10 minutos. Falta cuota diaria, borrado/reemplazo de voz anterior y política de retención. |
| TC-37 | Creación no atómica de perfil, contacto y username | Alto | ✅ dentro de Firestore | Se usa `writeBatch`. Sigue pendiente la atomicidad imposible entre Firebase Auth y Firestore (TC-50). |
| TC-38 | Login con Google podía crear una cuenta sin consentimiento | Alto privacidad | ✅ Corregido localmente | Login solo admite perfiles existentes; los nuevos deben completar Registro y consentimiento. |
| TC-44 | Errores internos de Stripe/Firestore expuestos al cliente | Medio | ✅ Corregido localmente | Mensajes inesperados son genéricos; el detalle queda en logs de servidor y se preservan `HttpsError` esperados. |
| TC-47 | Cancelación, expiración o impago de suscripción no revoca `isPro` | Alto negocio | ⏳ Pendiente | Falta definir periodo de gracia y manejar `customer.subscription.deleted`, `invoice.payment_failed` y estados de Stripe de forma idempotente. |
| TC-48 | Stripe Connect usa URLs antiguas `talking-crow.web.app` | Medio funcional | ⏳ Pendiente | Requiere confirmar dominio canónico y URLs autorizadas en Stripe antes de cambiar onboarding. |
| TC-49 | `usernames/{username}` permite consultas puntuales públicas | Medio privacidad | ⏳ Pendiente | `list` está bloqueado, pero se puede probar existencia nombre por nombre. Cerrarlo requiere una Callable de disponibilidad con rate limit/App Check. |
| TC-50 | Puede quedar usuario Auth huérfano si falla el batch Firestore | Medio funcional | ⏳ Pendiente | Requiere onboarding recuperable/compensación del usuario Auth; no se intentó borrar cuentas automáticamente. |
| TC-56 | El release automatizado no despliega reglas ni Functions | Crítico operativo | ⏳ Pendiente | Ajustar el pipeline con ambientes, revisión de secretos y despliegue explícito. No se cambió para evitar que el siguiente uso publique recursos de nube inesperadamente. |

## Archivos y funciones que parecen basura, legado o cascarón

No se eliminó ninguno.

| Archivo / área | Clasificación | Evidencia | Recomendación |
|---|---|---|---|
| `backend/main.py` | Legado peligroso si se ejecuta | FastAPI alterno, CORS `*`, endpoint simulado y TODO; ningún launcher lo referencia. El backend real es `backend/app.py`. | Eliminar o mover a `archive/` tras confirmar historial. |
| `backend/db/database.py` | Implementación de DB abandonada | SQLAlchemy alterno que crea `talking_crow.db` al importarse; el backend real importa `backend/database.py` (sqlite3). | Conservar solo una implementación. |
| `patch_backend.py`, `patch_frontend.py` | Scripts de parche de una sola vez, obsoletos | Intentan reinsertar rutas antiguas sin autenticación y reemplazos textuales que ya no coinciden. | Eliminar después de respaldar el commit que los originó. |
| `frontend/test_client_rules.js` | Archivo incompleto | Config Firebase vacía, imports sin uso y ninguna prueba. | Reemplazar por tests reales del emulador o eliminar. |
| `frontend/test.js`, `frontend/check-local.js` | Pruebas sin valor verificable | Solo leen tamaño de un archivo o contienen un comentario. | Eliminar o convertir en prueba automatizada. |
| `backend/check_user.py`, `web/functions/check_user.js` | Diagnóstico ad hoc con PII | Correos/usernames concretos y uso de Admin; además están sin seguimiento. | No versionar; parametrizar si se conserva como herramienta. |
| `backend/test_api.py` | Prueba obsoleta | Llama `getEulerKey` y `generateTTS`, exports que ya no existen. | Eliminar o reescribir contra las Callables actuales. |
| `backend/test_broadcast.py` | Prueba rota | Llama endpoint ahora autenticado sin token. | Adaptar a `local_config.json` o eliminar. |
| `backend/debug_tiktok.py`, `test_live.py`, `test_tiktok.py`, `test_tt.py` | Diagnósticos manuales duplicados | Varios usuarios TikTok hardcodeados y cuatro formas de probar la misma librería. | Consolidar en un CLI con argumento `--username`. |
| `backend/test_output.mp3` | Artefacto generado | El propio `test_api.py` lo genera; no es fuente. | Sacar de Git en una limpieza posterior. |
| `frontend/src/assets/react.svg`, `vite.svg`, `hero.png` y equivalentes web | Assets probablemente sin uso | No aparecen referenciados en el código revisado. | Confirmar en bundle y eliminar en lote. |
| `web/src/pages/ModerationPanel.jsx` | Vista huérfana | No está importada ni enrutada; además busca una key inexistente en `sessionStorage`. | Eliminar o integrar usando el puente seguro de Electron. |
| `SupportPage.jsx` (web y app) | Cascarón visible | Inputs sin estado; “Enviar Mensaje” no tiene handler. | Deshabilitar con texto “próximamente” o implementar backend/ticketing. |
| `PortConfigPage.jsx` (web y app) | Cascarón visible | “Guardar y Reiniciar” no tiene handler y el puerto está fijo en la ejecución. | Ocultar hasta definir reinicio/configuración segura. |
| Secciones “Agregar tarjeta” e historial | Cascarón visible | Botones sin handler y tablas estáticas; Stripe Checkout no guarda tarjeta aquí. | Retirar promesa de UI o implementar Customer Portal. |
| Descarga Windows en `CreatorsPage.jsx` | Cascarón visible | Solo muestra un `alert` de “en construcción”. | Conectar a un artefacto firmado o deshabilitar claramente. |

## Verificaciones ejecutadas

| Verificación | Resultado |
|---|---|
| `py_compile` de backend, DB, TTS y pruebas modificadas | ✅ Sin errores |
| `node --check` de Electron, preload y Cloud Functions | ✅ Sin errores |
| `npm run lint` en app y web | ✅ Sin errores; quedan warnings de código legado/incompleto |
| `npm run build` en app Electron/Vite | ✅ Build generado |
| `npm run build` en web | ✅ Build generado |
| Búsqueda de exports y rutas API duplicadas | ✅ Sin duplicados |
| Búsqueda del API key local expuesto y secretos Stripe/ElevenLabs literales | ✅ Sin la key expuesta reportada; la Firebase web API key es identificador público por diseño |
| `npm audit --omit=dev` app/web | ✅ 0 vulnerabilidades |
| `npm audit --omit=dev` Functions | ⚠️ 8 moderadas transitivas por `uuid`; arreglo automático completo requiere major breaking |
| Emulador de reglas Firestore | ⚠️ No ejecutado: Java 8 instalado; Firebase CLI exige Java 21+ |
| Producción `talkingcroow.com`, Stripe real y Firebase desplegado | ⚠️ No modificados ni certificados en esta revisión |

## Orden recomendado de lo pendiente

1. Corregir el pipeline y desplegar reglas/Functions en un ambiente de prueba; mientras esto no ocurra, los parches de nube no existen en producción.
2. Mantener cerrados `processTTSMessage`, `requestPayout` y `consumeFeature` hasta implementar identidad, ledger e idempotencia.
3. Rotar credenciales expuestas históricamente y revisar historial Git/secret manager.
4. Diseñar baja/impago de suscripciones y reconciliación Stripe.
5. Migrar cuentas/PII heredados y consentimiento de usuarios existentes.
6. Probar reglas con Java 21 y tests de Firestore Emulator antes del despliegue.
7. Planear la actualización mayor de Firebase Admin que resuelve `uuid` y ejecutar regresión de pagos/webhooks.
8. Añadir App Check, límites por usuario/IP y cuotas de ElevenLabs/almacenamiento.
