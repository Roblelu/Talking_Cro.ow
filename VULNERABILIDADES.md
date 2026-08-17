# Auditoría de Seguridad y Lógica - Talking Crow

### 🚨 1. Fallas Críticas de Lógica / Implementaciones Incompletas

**A. El Panel de Moderación es inaccesible (Falta de Input de API Key)**
El archivo `web/src/pages/ModerationPanel.jsx` hace peticiones al backend local (`127.0.0.1:8763`) usando una llave de autorización: `sessionStorage.getItem("local_api_key")`. Sin embargo, en toda la página web no existe ningún formulario para que el streamer ingrese esta llave, haciendo que el panel sea inútil a menos que se inyecte la llave manualmente en la consola del navegador.

**B. Autenticación de Escritorio Fantasma (`talkingcrow://`)**
En `DesktopAuth.jsx`, la web redirige al usuario a `talkingcrow://auth?token=<customToken>`. Sin embargo, en el código actual del backend (`backend/app.py`), no existe lógica que intercepte este protocolo ni valide el `customToken`. La app de Python usa su propio sistema aislado de seguridad (`LOCAL_API_KEY`) y no consume la identidad de Firebase.

**C. Firmas de TikTokLive Incompletas**
En `backend/app.py` (línea 22) se tiene `WebDefaults.sign_api_key = ""`. Actualmente, TikTok ofusca y bloquea conexiones a sus WebSockets si no se utiliza un servidor de firmas válido. Al dejar esto en blanco, es altamente probable que la conexión a los directos se caiga o falle.

**D. Creadores en Línea "Fantasma"**
La página `OnlineCreatorsPage.jsx` tiene un diseño y lógica de filtrado para mostrar a los streamers conectados, pero la lista está *hardcodeada* y vacía (`const mockCreators = [];`). Nunca hace una petición a la base de datos para obtener creadores reales. Además, si intentaran hacerlo, chocarían con las Reglas de Firestore actuales que bloquean la visualización global de perfiles (`allow list: if false`).

**E. EcoVoices "Hardcodeado" (Clonación inútil)**
En la función de cobro de TTS `processTTSMessage` (`index.js` línea 223) se tiene `let ecoVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Voz por defecto`. Esta función JAMÁS consulta la voz real clonada por el usuario en ElevenLabs, obligando a todos los donadores a usar la misma voz genérica en lugar de la que pagaron por clonar.

**F. Motor de Regalos de Audio Totalmente Incompleto**
Existen rutas en `backend/app.py` (`/api/gifts`) para guardar "Regalos" en la base de datos local SQLite con un campo `script`. Sin embargo, cuando llega un regalo de TikTokLive en la función `on_gift`, solo se notifica al frontend. **Nunca se ejecuta ningún script ni se reproduce ningún sonido local**, haciendo que toda la configuración de la tienda de regalos de la app sea un adorno que no cumple ninguna función técnica real en los streams.

**G. Link de MD a Fans Roto y Mensaje Ineficaz**
La aplicación frontend (`App.jsx`) intenta invitar a los fans por MD mediante una llamada al servidor local `GET /api/moderation/link` para copiar un enlace. Sin embargo, **esa ruta no existe en el servidor `app.py`**, por lo que la petición da un error 404 (Not Found). Adicionalmente, la lógica actual no provee un mensaje persuasivo personalizado para atrapar al usuario; solo intenta copiar un texto genérico o URL cruda. Se requiere crear una API en Firebase o Python que devuelva un enlace dinámico con un mensaje persuasivo real (`Ej: "¡Hey! Escucha tu voz en mi directo..."`).

**H. Falta de Wallet Dropdown en Header (Lógica Incompleta - NUEVO)**
Tanto en la App de escritorio como en la Web, el header solo muestra un número genérico de saldo. Se solicitó implementar un botón interactivo (Wallet Dropdown) junto a la imagen de perfil del usuario. Al oprimirlo, se debe activar un *toggle* que muestre las tres monedas del sistema (`Croins`, `Créditos IA` y `Croin Cash`), respetando las reglas de visualización actuales (ocultando los que no apliquen o tengan cero, según corresponda).

**I. Suscripciones Pro No Procesadas en el Webhook (NUEVO)**
La plataforma permite iniciar un `checkout` de suscripción mensual (Plan Pro) en `createSubscriptionCheckout`, pero el `index.js` del Webhook de Stripe **no maneja el evento `checkout.session.completed`**. Cuando un usuario paga exitosamente la suscripción, la plataforma nunca se entera y no le otorga los "Créditos IA" ni la bandera `isPro`.

**J. Ausencia de Generación y Envío de Facturas de Stripe**
La plataforma procesa pagos, pero actualmente en la configuración de la intención de pago (`createPaymentIntent`) no se activa la bandera para generar automáticamente una factura fiscal (invoice) ni se envían comprobantes (receipt_email) automáticos al donador con validez ante Hacienda o el usuario final. El usuario debe tener un panel o un correo automático donde pueda consultar sus facturas o "Receipts" de las compras de Croins.

**K. Vacío Legal y Fiscal (Falta de Contratos Vinculantes)**
- **Términos y Condiciones (T&C):** Actualmente el sistema no exige explícitamente a los fans reconocer que los Croins son "Non-refundable" y no representan dinero real (sólo una licencia de uso de software cerrado).
- **Acuerdo de Creadores:** Los streamers no firman ni aceptan una adenda donde estipulen que sus ganancias son "Comisiones" y que ellos son responsables de su propia declaración de impuestos (ISR/IVA) en su país respectivo, lo cual expone legalmente a la plataforma ante la autoridad fiscal.

### ⚠️ 2. Vulnerabilidades Críticas y de Seguridad

**A. Robo de Croins y Fraude Financiero (Vulnerabilidad Crítica en `processTTSMessage`)**
La Cloud Function `processTTSMessage` es llamada por el cliente del Streamer para procesar un mensaje. El streamer envía el parámetro `tiktok_username` del fan que supuestamente hizo la donación. La función **confía ciegamente en este parámetro** y deduce los Croins de la cuenta de ese fan, acreditando dinero real (`creator_earnings`) al streamer. 
**Impacto:** Un streamer malicioso puede modificar su cliente local para enviar peticiones falsas a nombre de usuarios ricos (ej. `@UsuarioConMuchosCroins`), robando su saldo para generar ganancias económicas reales sin el consentimiento del usuario.

**B. Fuga de Llave Maestra en Control de Versiones (NUEVO - Catastrófico)**
El archivo `backend/firebase-service-account.json` está guardado dentro del directorio del proyecto, y el archivo `.gitignore` **NO lo está excluyendo**.
**Impacto:** Si se hace un `git push` a un repositorio público o privado, cualquier atacante que consiga acceso al repo tendrá la llave maestra "Root" de Firebase, pudiendo saltarse todas las reglas de Firestore, descargar toda la base de datos de usuarios y borrar el proyecto entero.

**C. LFI (Local File Inclusion) y Borrado Arbitrario (Crítico)**
Los endpoints `@app.get("/api/audio/{filename}")` y `@app.delete("/api/audio/{filename}")` unen la variable `filename` directamente a la ruta usando `os.path.join` **sin sanitizar los caracteres `../` ni requerir autenticación**. 
**Impacto:** Cualquier web maliciosa o script puede leer archivos de contraseñas de la PC del streamer, o incluso peor, enviar un `DELETE` a `../../../../Windows/System32/cmd.exe` o archivos vitales del sistema, logrando destrucción arbitraria de archivos en la máquina local de los creadores.

**D. Escucha Furtiva de Chat (SSE Hijacking - Privacidad)**
El endpoint `@app.get("/api/live_events")` transmite en tiempo real (Server-Sent Events) todo lo que ocurre en el directo del streamer (mensajes de chat crudos, IDs únicos, eventos). Sin embargo, este endpoint **no requiere la llave de autenticación**.
**Impacto:** Dado el CORS permisivo, un tercero malicioso puede suscribirse silenciosamente a este canal y espiar la actividad del stream.

**E. Denegación de Servicio (DoS) Local en el Motor de Voz**
El endpoint `@app.post("/api/tts/test")` está completamente desprotegido (no requiere `LOCAL_API_KEY`).
**Impacto:** Un atacante puede aprovechar esto para enviar miles de peticiones de síntesis de voz masivas al mismo tiempo. Al procesarse localmente, esto saturaría por completo el CPU/GPU de la PC del streamer, bloqueando su juego o directo hasta congelar la máquina.

**F. Ausencia de Prevención de Lavado de Dinero (AML) y Manejo de Contracargos**
El sistema actual transfiere ingresos inmediatamente al balance `creator_earnings` y permite retirarlos sin un periodo de "Cuarentena" (congelamiento de fondos).
**Impacto:** Un atacante con tarjetas de crédito clonadas podría comprar Croins, donárselos a su propia cuenta de Streamer o a un cómplice, y retirar el dinero a su banco instantáneamente. Cuando el dueño real de la tarjeta inicie un contracargo en Stripe, el dinero ya habrá desaparecido de la plataforma. Tu webhook actual de Stripe ignora los eventos de fraude (`charge.dispute.created`).

**G. Fuga de Información Personal (API Endpoint sin Autenticar)**
En el backend local (`backend/app.py`), el endpoint `@app.get("/api/settings")` **NO cuenta con protección de token**. 
**Impacto:** Revela silenciosamente el nombre de usuario de TikTok y la estructura interna de rutas de archivos de la PC.

**H. Puertos y Direcciones Hardcodeadas (Vulnerabilidad de Estabilidad)**
El frontend asume ciegamente que el backend siempre estará en `127.0.0.1:8763`. Si este puerto es ocupado por un antivirus, la app se "romperá".

**I. CORS Extremadamente Permisivo en el Backend Local**
El servidor local de FastAPI (`backend/app.py`) tiene configurado `allow_origins=["*"]`, permitiendo a cualquier página web externa intentar los ataques LFI/DoS descritos arriba en nombre del usuario local.

**J. App Check Ausente en Funciones Core**
La función `processTTSMessage` no tiene habilitado `{ enforceAppCheck: true }`, permitiendo automatización externa si el token es robado.

**K. Sobrescritura Destructiva de Voces (EcoVoices)**
En `createEcoVoice`, se usa una ruta estática `eco_voices/${uid}/voice_sample.webm`. Si el usuario sube un audio nuevo por error, el antiguo se sobrescribe y se pierde irreparablemente.

---

## 📝 Plan de Implementación de Fases (Borrador)

1. **Fase 5: Blindaje de Seguridad y Finanzas (Prioridad Absoluta)**
   - Cerrar fugas del `firebase-service-account.json`.
   - Asegurar rutas locales (`LFI`, `SSE Hijacking`, `DoS`).
   - Reparar la Cloud Function de donaciones (`processTTSMessage`) para evitar robos y fraudes.
2. **Fase 6: Dashboard de Rentabilidad Administrativo (Ledger)**
   - Crear el panel administrador.
   - Implementar matemática de descuentos (Stripe, Firebase, ElevenLabs) y reportes de rentabilidad en tiempo real.
3. **Fase 7: Frontend Clean Architecture**
   - Refactorizar el espagueti de React en `web/src` introduciendo Custom Hooks y Capa de Servicios.
4. **Fase 8: Empaquetado y Distribución de App**
   - Configurar scripts de construcción (Electron Builder) para Windows/Mac.
   - Proveer enlaces de descarga directa desde la Landing Page (`talkingcroow.com`).
5. **Fase 9: Interfaz y Experiencia (Nuevas Características)**
   - Implementar el Wallet Dropdown (Croins, Credits, Croin Cash) en el header universal.
   - Rediseño de componentes visuales pendientes.
