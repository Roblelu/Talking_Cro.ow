# Croins, créditos y cupones

## Versión publicada verificada
GitHub latest y latest.yml: 1.3.8, publicada el 24 de septiembre de 2026 a las 13:09:08 UTC. Instalador Talking_Cro.ow_1.3.8.exe. SHA-256 del instalador local y del asset publicado coincidentes.

## Saldos independientes
- purchased_croins: compras confirmadas por webhook de pagos. Pueden originar comisión al creador Pro cuando se gastan en Eco.
- promotional_croins: regalos, cupones y recargas del administrador. Se gastan antes que los comprados; no originan comisión monetaria.
- creator_credits: reproducciones de TTS normal del creador. consumeTTSCredit descuenta uno; el escritorio excluye las voces Eco de ese consumo. No son Croins ni saldo retirable.
- creator_earnings: comisiones del creador; no se modifica al canjear un cupón.
- Eco cuesta 12 Croins por solicitud; las infracciones graves también se cobran conforme a la política existente.

## Fuentes de créditos existentes
Bienvenida: establece 35 únicamente si el saldo es cero y todavía no se reclamó. Suscripción: suma 1000 y actualiza Pro. Recarga de superusuario: suma 1000. claimFreeTier: establece 10000 y desactiva Pro; sobrescribe el saldo, no suma, y no tiene una marca de reclamación única en el código actual. Esta última regla no se modificó en esta tarea.

## Cupones
Antes: un lote fijo con 1 multi de 48 Croins (25 usuarios), 25 únicos de 96 y 50 únicos de 24, caducidad de 24 horas.
Ahora: la nueva interfaz genera el mismo lote y 76 cupones adicionales de créditos. Las cantidades de créditos se fijan en el servidor al triple de los Croins: 1 multi de 144 (25 usuarios), 25 únicos de 288 y 50 únicos de 72. Las cantidades enviadas por el cliente se ignoran. La validez de 24 horas corresponde al cupón, no introduce vencimiento del saldo canjeado.
Cada documento identifica currency croins/credits; ausencia de ese campo conserva compatibilidad con cupones antiguos de Croins. El servidor valida autorización y cantidades, genera códigos criptográficos y usa create para impedir sobrescribir códigos existentes. El canje actualiza cupón, saldo correspondiente y registro contable en una sola transacción. Los datos del cliente no pueden elegir moneda ni cantidad al canjear. No activa Pro.
El canje está disponible en el Dashboard web y en la página Eco; los avisos distinguen el saldo entregado. No requiere actualizar el ejecutable para recibir créditos: el escritorio ya observa creator_credits en Firebase.

## Validación
35 pruebas de funciones y frontend, más 7 pruebas de backend: autorización, 152 cupones, compatibilidad antigua, separación de saldos, intentos concurrentes, límite multiuso, caducidad, datos manipulados y ausencia de perfil. Compilación Vite correcta (advertencia de tamaño de bundle preexistente).
No se generaron cupones ni se añadieron saldos reales para probar.

## Publicación
generateCoupons y redeemCoupon desplegadas correctamente el 24 de septiembre de 2026, junto con Firebase Hosting. Se verificó que el bundle servido coincide con la compilación y que ambas funciones devuelven UNAUTHENTICATED sin sesión. El 24 de septiembre se actualizaron generateCoupons y Hosting con los créditos triples y se publicó el instalador 1.3.8. También se desplegó getBaseVoiceToken: comprobación autenticada HTTP 200, token temporal de 540 segundos. Se verificaron las cuatro voces con audio real y el arranque aislado del backend empaquetado. El instalador no incluye la clave maestra de voces ni el archivo de cuenta de servicio.

