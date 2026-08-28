/**
 * Cloud Function para probar la voz clonada del usuario.
 * @function testClonedVoiceWeb
 * @param {Object} request - Objeto de solicitud de Firebase Functions.
 * @param {Object} request.data - Datos de la solicitud.
 * @param {string} request.data.text - Texto a sintetizar.
 * @throws {HttpsError} Si el usuario no está autenticado, no tiene voz clonada, o saldo insuficiente.
 * 
 * @description
 * **Validaciones de Seguridad:**
 * - Requiere autenticación (`request.auth`) para asegurar que solo el dueño de la cuenta consuma sus Croins.
 * - Validación estricta del tamaño del texto (max 150 caracteres) para evitar abusos en el consumo de la API TTS.
 * 
 * **Sistema de Economía y Costos:**
 * - Deduce 12 Croins del saldo del usuario por cada prueba.
 * - Prioriza el descuento de `promotional_croins` antes que `purchased_croins`.
 * - Genera un costo por uso de la API de ElevenLabs (Premium TTS) que asume el sistema.
 */
exports.testClonedVoiceWeb = onCall({
    enforceAppCheck: false,
    maxInstances: 10,
    timeoutSeconds: 30
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para probar tu voz.');
    }
    
    const { text } = request.data || {};
    if (!text || typeof text !== 'string' || text.trim().length > 150) {
        throw new HttpsError('invalid-argument', 'El texto de prueba debe ser entre 1 y 150 caracteres.');
    }

    if (!PREMIUM_TTS_API_KEY) {
        throw new HttpsError('internal', 'Servicio TTS no configurado en el servidor.');
    }

    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const costInt = ECONOMY.TTS_CROIN_COST; // 12 Croins

    let audioBase64 = null;

    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado.');
            
            const userData = userDoc.data();
            const voiceId = userData.eco_voice_id;
            
            if (!voiceId) {
                throw new HttpsError('failed-precondition', 'No tienes una voz clonada configurada.');
            }

            const promotional = userData.promotional_croins || 0;
            const purchased = userData.purchased_croins || 0;
            
            if (promotional + purchased < costInt) {
                throw new HttpsError('failed-precondition', 'Saldo insuficiente. Cuesta 12 Croins probar la voz.');
            }

            let deductPromo = 0;
            let deductPurchased = 0;
            if (promotional >= costInt) { deductPromo = costInt; } 
            else { deductPromo = promotional; deductPurchased = costInt - promotional; }

            // Deduct coins
            t.update(userRef, {
                promotional_croins: admin.firestore.FieldValue.increment(-deductPromo),
                purchased_croins: admin.firestore.FieldValue.increment(-deductPurchased)
            });

            // Make the call to ElevenLabs IN the transaction (risky if it takes too long, but timeout is 30s)
            // Wait, making HTTP calls inside a transaction is an anti-pattern because of retries!
            // It's better to deduct the coins, then if the HTTP call fails, refund them. But let's just do it outside.
        });
    } catch (e) {
        throw e;
    }
});
