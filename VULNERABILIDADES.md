# Registro de seguridad y deuda técnica — Talking Cro.ow

Última revisión: **2026-08-17**  
Alcance: código local de la app Electron/FastAPI, web React, Cloud Functions, reglas de Firestore y scripts de operación.  
Esta revisión **no desplegó cambios**, no ejecutó pruebas intrusivas contra producción y no puede garantizar ausencia absoluta de vulnerabilidades.

## Leyenda

| Estado | Significado |
|---|---|
| 🛡️ Mitigado localmente | El flujo riesgoso quedó cerrado o limitado; falta el diseño definitivo. |
| 🟡 Parcial | Se corrigió una parte, pero queda trabajo técnico, migración o despliegue. |
| ⏳ Pendiente | No se modificó porque requiere una decisión de producto, migración, infraestructura o cambio de alto impacto. |
| 🌐 Externo | Depende de producción, rotación de credenciales o configuración fuera del repositorio. |
| ✅ Corregido | Completamente resuelto localmente en el código actual. |

> **Advertencia de release:** Asegúrate de ejecutar `firebase_deploy.bat` para desplegar las reglas y funciones antes de probar en producción.

## Aplicación de escritorio y backend local

| ID | Hallazgo | Riesgo | Estado | Acción realizada / pendiente |
|---|---|---:|---|---|
| TC-51 | Medios locales no tienen cuota total, expiración ni limpieza automática | Medio | ⏳ Pendiente | Un usuario legítimo o fallo repetitivo puede llenar disco con archivos válidos de hasta 10 MB. Requiere política de retención y cuota. |
| TC-52 | Uso de `@app.on_event` obsoleto | Bajo | ✅ Corregido | Refactorizado a `lifespan` y agregada protección de memoria `maxsize=100` a la cola TTS. |
| TC-53 | Lectura pública de audio/media y `overlay/pop` en localhost | Bajo–Medio | ⏳ Pendiente | Es necesaria para OBS/browser source actual. Para cerrarla se requiere una URL efímera o token compatible con OBS. |
| TC-55 | Subida manual de voz en la cuenta de Electron es un cascarón | Bajo funcional | ⏳ Pendiente | El selector solo muestra un aviso; la grabadora sí tiene lógica. No se fingió una implementación durante el parche de seguridad. |
| TC-58 | Dependencia no documentada en API de terceros para avatares (`tikwm.com`) | Medio privacidad | ⏳ Pendiente | Si falla la obtención del avatar, se llama a esta API externa. Podría caerse o exponer uso a terceros. Reevaluar su necesidad como fallback. |

## Página web, Firebase y pagos

| ID | Hallazgo | Riesgo | Estado | Acción realizada / pendiente |
|---|---|---:|---|---|
| TC-07 | Creación pública/automatizable de PaymentIntents | Alto | 🟡 Parcial | Ahora exige Firebase Auth y paquete válido. Falta App Check/rate limiting para abuso con cuentas automatizadas. |
| TC-08 | Secretos incrustados en código y configuración versionada | Alto | 🌐 Externo | El árbol actual ya no contiene las claves revisadas y los tests usan variables/config local. Falta rotar todas las credenciales expuestas y, si se requiere, limpiar historial Git. |
| TC-10 | Modelo antiguo de PII y documentos por username | Alto | 🟡 Parcial | Nuevos registros usan UID y subdocumento privado. Los datos históricos siguen sujetos a TC-19. |
| TC-14 | Flujo de pagos mal enrutado o bundle distinto al código | Alto funcional | 🟡 Parcial | Código y builds locales son coherentes; no se verificó el bundle ni las Functions desplegadas en producción. |
| TC-18 | CSP y encabezados incompletos | Medio | 🌐 Pendiente | Configurados CSP, anti-frame, nosniff, referrer, permissions y HSTS. Falta despliegue/verificación HTTP en producción. |
| TC-19 | Cuentas heredadas sin migración UID/PII | Medio–Alto | ⏳ Pendiente | Requiere respaldo, inventario y migración idempotente con Admin SDK; no se ejecutó una migración destructiva. |
| TC-21 | Datos enviados a TTS de terceros sin evidencia de consentimiento | Medio privacidad | 🟡 Parcial | Nuevos registros exigen consentimiento y guardan versión/fecha/método. Falta obtener o registrar consentimiento de cuentas existentes y definir retención del proveedor. |
| TC-22 | Dependencias con `uuid < 11.1.1` | Medio | ✅ Corregido | Se actualizó `firebase-admin` a v14 y se forzó `uuid` a la versión parcheada. |
| TC-24 | Producción puede servir un despliegue anterior | Medio operativo | 🌐 Pendiente | Se generaron builds locales correctos; no se desplegó ni se comparó el hash servido por producción. |
| TC-31 | `processTTSMessage` permitía que el streamer eligiera qué cuenta TikTok pagaba | Crítico | 🛡️ Mitigado localmente | El precio ya no viene del cliente; el cliente evita llamar la Function y el servidor también rechaza el flujo premium. Falta una prueba firmada que vincule evento TikTok ↔ usuario Firebase y una operación idempotente por evento. |
| TC-32 | Retiro Stripe ejecutado dentro de una transacción reintentable | Crítico financiero | 🛡️ Mitigado localmente | `requestPayout` queda deshabilitada. Falta ledger, idempotency key, estados de retiro y reconciliación por webhook. |
| TC-33 | `consumeFeature` aceptaba feature/precio del navegador | Alto | 🛡️ Mitigado localmente | Función cerrada hasta contar con catálogo de servidor y consumidores reales. |
| TC-36 | Clonado de voz con payload inconsistente, sin límites y errores fuera del `catch` | Alto abuso/costo | 🟡 Parcial | Payload unificado, MIME/base64/tamaño máximo 10 MB, nombre controlado por servidor, `maxInstances` y cooldown de 10 minutos. Falta cuota diaria, borrado/reemplazo de voz anterior y política de retención. |
| TC-47 | Cancelación, expiración o impago de suscripción no revoca `isPro` | Alto negocio | ⏳ Pendiente | Falta definir periodo de gracia y manejar `customer.subscription.deleted`, `invoice.payment_failed` y estados de Stripe de forma idempotente. |
| TC-48 | Stripe Connect usa URLs antiguas `talking-crow.web.app` | Medio funcional | ⏳ Pendiente | Requiere confirmar dominio canónico y URLs autorizadas en Stripe antes de cambiar onboarding. |
| TC-49 | `usernames/{username}` permite consultas puntuales públicas | Medio privacidad | ⏳ Pendiente | `list` está bloqueado, pero se puede probar existencia nombre por nombre. Cerrarlo requiere una Callable de disponibilidad con rate limit/App Check. |
| TC-50 | Puede quedar usuario Auth huérfano si falla el batch Firestore | Medio funcional | ⏳ Pendiente | Requiere onboarding recuperable/compensación del usuario Auth; no se intentó borrar cuentas automáticamente. |
| TC-57 | Regla de creación de `support_tickets` permite inyección de campos | Bajo | ✅ Corregido | Se usaba `hasAll`, permitiendo inyectar campos. Se cambió a `hasOnly` para asegurar el esquema. |

## Orden recomendado de lo pendiente

1. Mantener cerrados `processTTSMessage`, `requestPayout` y `consumeFeature` hasta implementar identidad, ledger e idempotencia.
2. Rotar credenciales expuestas históricamente y revisar historial Git/secret manager.
3. Diseñar baja/impago de suscripciones y reconciliación Stripe.
4. Migrar cuentas/PII heredados y consentimiento de usuarios existentes.
5. Planear la actualización mayor de Firebase Admin que resuelve `uuid` y ejecutar regresión de pagos/webhooks.
6. Añadir App Check, límites por usuario/IP y cuotas de ElevenLabs/almacenamiento.
