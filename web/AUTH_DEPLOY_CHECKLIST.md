# Checklist manual del parche de autenticación

Este archivo documenta requisitos externos. Ninguno de estos pasos se ejecuta
automáticamente durante la implementación o las pruebas locales.

## Antes de publicar

1. En Firebase Authentication, confirmar que siguen autorizados:
   - `talkingcroow.com`
   - `talking-crow.web.app`
   - `talking-crow.firebaseapp.com`
2. En la configuración OAuth de Google, autorizar exactamente:
   - `https://talkingcroow.com/__/auth/handler`
   - `https://talking-crow.web.app/__/auth/handler`
3. En la clave reCAPTCHA v3 usada por App Check, agregar `talkingcroow.com` a
   los dominios permitidos. No activar enforcement hasta comprobar métricas en
   ambos dominios.
4. Para ejecutar el emulador de reglas con Firebase Tools 15, usar JDK 21 o
   superior. El Java 8 instalado actualmente no es compatible con el emulador.
5. Ejecutar localmente desde `web`:
   - `npm test`
   - `npm run lint`
   - `npm run build`
6. Ejecutar desde `frontend`:
   - `npm run lint`
   - `npm run build`

## Publicación bajo control de Vridel

El repositorio conserva `firebase_deploy.bat` como mecanismo de publicación. El
parche no ejecuta ese archivo, no publica Hosting/Functions/Rules y no genera una
release de Electron.

## Comprobación posterior

- Registro nuevo desde escritorio en ambos dominios.
- Registro y login desde Chrome Android y Safari iOS.
- Cuenta de Google existente sin `users/{uid}`: debe mostrar “Completar registro”.
- App Electron: navegador → `/auth-desktop` → diálogo `talkingcrow://` → dashboard.
- Revisar métricas de App Check y errores `permission-denied` sin inspeccionar PII.
