# Plan de Resolución de Deuda Técnica Restante

Sí, todavía quedan **18 elementos activos** en `VULNERABILIDADES.md`. 
Respecto a tu pregunta: **Sí, hay un riesgo considerable de romper el código.** Las vulnerabilidades restantes ya no son simples parches de 3 líneas; son problemas profundos de arquitectura. Por ejemplo:
- Actualizar dependencias (TC-22) obliga a subir `firebase-admin` a la versión 14, lo cual es un cambio mayor (*breaking change*) que puede tumbar tus Cloud Functions si alguna API de Firebase cambió.
- Migrar datos antiguos (TC-10, TC-19) manipulará la base de datos de producción; si algo sale mal, usuarios reales podrían perder su acceso o su saldo.

Para minimizar este riesgo, no podemos hacer todo de golpe. He diseñado un plan dividido en **4 Fases (Sprints)**. Así podremos resolver, probar y estabilizar paso a paso.

---

## 📅 Fase 1: Infraestructura y Entorno (Sugerida para empezar hoy)
*Riesgo: Medio-Bajo | Impacto: Alto en seguridad base*

1. **TC-22 (Dependencias vulnerables):** Realizaremos el `npm audit fix --force` en las Cloud Functions para actualizar `firebase-admin` a la v14. Revisaremos el código de `index.js` para asegurar que las llamadas a Firestore/Auth sean compatibles con esta nueva versión antes de desplegar.
2. **TC-08 (Limpieza de Git):** Te proporcionaré los comandos exactos (ej. `git filter-repo` o `BFG`) para que tú mismo limpies el historial de tu repositorio y las claves queden eliminadas para siempre, protegiéndote de raspadores automáticos.
3. **TC-52 (`@app.on_event` obsoleto):** Migraremos el backend de Python para usar el nuevo modelo de `lifespan` de FastAPI, preparando el servidor para no depender de librerías viejas.

---

## 📅 Fase 2: Identidad y App Check
*Riesgo: Medio | Impacto: Alto en prevención de abuso*

1. **TC-07 y TC-49 (Rate limiting y App Check):** Activaremos Firebase App Check (con reCAPTCHA v3 para la web) para impedir que scripts automatizados llamen a tus endpoints (como crear PaymentIntents o listar usernames masivamente).
2. **TC-51 (Cuota de medios locales):** Implementaremos un sistema en Python que borre automáticamente archivos antiguos generados (`tts_engine`) si exceden cierto espacio en disco.

---

## 📅 Fase 3: Migración de Usuarios
*Riesgo: Muy Alto (Base de datos) | Impacto: Crítico para privacidad*

1. **TC-10 y TC-19:** Diseñaremos un script local de Python o JS (no público en la nube) para respaldar la base de datos, iterar sobre los usuarios antiguos y moverlos al nuevo esquema unificado (`uid` y subdocumento `/private/contact`).

---

## 📅 Fase 4: Lógica Financiera (Stripe & Creator Ledger)
*Riesgo: Crítico (Dinero) | Impacto: Crítico para negocio*

1. **TC-31, TC-32, TC-33, TC-47:** Diseño del sistema de "Ledger" (libro contable). Implementación segura de retiros de dinero, idempotencia de webhooks, y lógica de expiración de suscripciones (`isPro = false` si falla el pago en Stripe).

---

## Open Questions (Tu Decisión)

> [!IMPORTANT]
> Para no romper la aplicación, mi sugerencia es que iniciemos **únicamente con la Fase 1**, apliquemos los cambios, compruebes que todo funciona (que puedes correr la app local y desplegar) y luego pasemos a la Fase 2 en otra sesión. 
> 
> **¿Estás de acuerdo con arrancar la Fase 1 (Actualización de dependencias y limpieza de Git), o hay alguna vulnerabilidad específica de otra fase que te urja resolver hoy mismo?**