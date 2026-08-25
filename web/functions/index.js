const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const functionsV1 = require("firebase-functions");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { getStorage } = require("firebase-admin/storage");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors")({ origin: true });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

admin.initializeApp();
admin.firestore = () => getFirestore();
admin.firestore.FieldValue = FieldValue;
admin.firestore.Timestamp = Timestamp;
admin.auth = () => getAuth();


const db = getFirestore();

// Configuración de las APIs protegidas
// Extraemos las variables de entorno que subiremos a Firebase
const PREMIUM_TTS_API_KEY = process.env.ELEVENLABS_API_KEY || process.env.PREMIUM_TTS_API_KEY;
// El cliente actual no aporta una prueba firmada que vincule al autor del chat
// de TikTok con una cuenta de Firebase. Mantener el cobro activo permitiría que
// un streamer eligiera qué cuenta registrada paga el mensaje.
const PREMIUM_TTS_BILLING_ENABLED = true;

// Reglas de la Economía (Fase 4)
const ECONOMY = {
    CROIN_TO_MXN_RATE: 0.14,
    CREATOR_COMMISSION_PERCENTAGE: 0.25,
    TTS_CROIN_COST: 12,
    MIN_PAYOUT_MXN: 300,
    PAYOUT_COOLDOWN_DAYS: 15
};
// ---------------------------------------------------------
// Pasarela de Pagos Segura (Stripe)
// ---------------------------------------------------------
const PACKAGES = {
    'pack_1': { price_mxn: 12, croins: 28 },
    'pack_2': { price_mxn: 35, croins: 110 },
    'pack_3': { price_mxn: 80, croins: 270 },
    'pack_4': { price_mxn: 140, croins: 500 },
    'pack_5': { price_mxn: 200, croins: 850 },
    'pack_6': { price_mxn: 260, croins: 1200 },
    'pack_7': { price_mxn: 330, croins: 1900 },
    'pack_8': { price_mxn: 420, croins: 2700 }
};

exports.createPaymentIntent = onCall(async (request) => {
    // TC-07: Verificación estricta de autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe iniciar sesión para realizar compras.');
    }
    
    // TC-02: El servidor dicta el UID y valida el Precio
    const uid = request.auth.uid;
    const packageId = request.data?.packageId;
    
    if (!packageId || !PACKAGES[packageId]) {
        throw new HttpsError('invalid-argument', 'Paquete inválido.');
    }
    
    const pack = PACKAGES[packageId];
    const amountInCents = pack.price_mxn * 100;

    try {
        const intent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: "mxn",
            payment_method_types: ['card'],
            metadata: { 
                donador_uid: uid,
                croins: pack.croins,
                packageId: packageId
            }
        });

        return { client_secret: intent.client_secret };
    } catch (error) {
        logger.error(`Error en createPaymentIntent: ${error.message}`);
        throw new HttpsError('internal', 'No se pudo iniciar el pago.');
    }
});

exports.createSubscriptionCheckout = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe iniciar sesión para realizar compras.');
    }
    const uid = request.auth.uid;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    recurring: { interval: 'month' },
                    unit_amount: 15000,
                    product_data: {
                        name: 'Plan Pro - Talking Cro.ow',
                        description: '1000 Créditos IA Mensuales'
                    }
                },
                quantity: 1,
            }],
            metadata: {
                uid: uid,
                type: 'pro_subscription'
            },
            success_url: 'https://talkingcroow.com/dashboard',
            cancel_url: 'https://talkingcroow.com/dashboard',
        });
        return { url: session.url };
    } catch (error) {
        logger.error(`Error en createSubscriptionCheckout: ${error.message}`);
        throw new HttpsError('internal', 'No se pudo iniciar la suscripción.');
    }
});

exports.claimWelcomeCredits = onCall({ enforceAppCheck: false }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'Usuario no encontrado.');
            }
            
            const data = userDoc.data();
            if (data.has_received_app_credits) {
                return; // Ya los recibió
            }
            
            // Otorgar 35 si tiene 0 (o si por error no tenía), si tiene más se queda igual
            const currentCredits = data.creator_credits || 0;
            const newCredits = currentCredits === 0 ? 35 : currentCredits;
            
            transaction.update(userRef, {
                creator_credits: newCredits,
                has_received_app_credits: true
            });
        });
        return { success: true };
    } catch (error) {
        logger.error(`Error en claimWelcomeCredits: ${error.message}`);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'No se pudieron acreditar los créditos de bienvenida.');
    }
});

exports.consumeTTSCredit = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);

    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'Usuario no encontrado.');
            }
            
            const data = userDoc.data();
            if ((data.creator_credits || 0) <= 0) {
                throw new HttpsError('failed-precondition', 'No tienes créditos suficientes.');
            }
            
            // Restar 1 crédito
            transaction.update(userRef, {
                creator_credits: admin.firestore.FieldValue.increment(-1)
            });
        });
        return { success: true };
    } catch (error) {
        logger.error(`Error en consumeTTSCredit: ${error.message}`);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'No se pudo consumir el crédito TTS.');
    }
});

// ============================================================================
// VERIFICACIÓN DE BIOGRAFÍA (ANTI-SANGUIJUELAS)
// ============================================================================
exports.verifyTiktokBio = onCall({
    maxInstances: 10,
    timeoutSeconds: 30,
}, async (request) => {
    // Verificar autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const { tiktokUsername, verificationCode } = request.data;
    
    if (!tiktokUsername || !verificationCode) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
    }
    
    // Limpiar el username por si acaso
    let cleanUsername = tiktokUsername.trim();
    if (cleanUsername.startsWith('@')) {
        cleanUsername = cleanUsername.substring(1);
    }
    
    logger.info(`Validando bio para @${cleanUsername} esperando el código ${verificationCode}...`);
    
    try {
        // Hacemos el request a la página pública
        const profileUrl = `https://www.tiktok.com/@${cleanUsername}`;
        const response = await axios.get(profileUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
            timeout: 10000 // 10 segundos máximo
        });
        
        const html = response.data;
        
        // Verificamos si el string está en cualquier parte del HTML
        // (TikTok suele inyectar la bio en un objeto JSON grande en <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">)
        if (html.includes(verificationCode)) {
            logger.info(`Código ${verificationCode} encontrado para @${cleanUsername}`);
            return { success: true };
        } else {
            logger.warn(`Código ${verificationCode} NO encontrado para @${cleanUsername}`);
            throw new HttpsError('not-found', 'No se encontró el código en la biografía. Asegúrate de haberlo guardado correctamente.');
        }
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        
        // Si fue un error de Axios (ej. 404 de TikTok, o bloqueo de Cloudflare)
        if (error.response) {
            if (error.response.status === 404) {
                throw new HttpsError('not-found', 'El usuario de TikTok no existe.');
            }
            logger.error(`TikTok retornó error HTTP ${error.response.status} para @${cleanUsername}`);
        } else {
            logger.error(`Error de red/Axios verificando bio para @${cleanUsername}: ${error.message}`);
        }
        
        throw new HttpsError('internal', 'No se pudo verificar la biografía. Intenta nuevamente.');
    }
});

exports.processTTSMessage = onCall(async (request) => {
    // Seguridad Fase 5: Solo el streamer logueado en la app puede solicitar procesar un TTS de su chat.
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para procesar TTS.');
    }

    const { tiktok_username, streamer_uid, message } = request.data || {};
    
    // Verificamos que el streamer no intente cobrar a nombre de otro
    if (request.auth.uid !== streamer_uid) {
        throw new HttpsError('permission-denied', 'Acceso denegado: No puedes procesar TTS para otro streamer.');
    }

    if (!PREMIUM_TTS_BILLING_ENABLED) {
        throw new HttpsError(
            'failed-precondition',
            'El TTS premium está temporalmente deshabilitado hasta validar la identidad del donador.'
        );
    }

    if (typeof tiktok_username !== 'string' || typeof streamer_uid !== 'string' || typeof message !== 'string' ||
        !tiktok_username.trim() || !streamer_uid.trim() || !message.trim()) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos (tiktok_username, streamer_uid, message).');
    }
    if (tiktok_username.length > 80 || message.length > 300) {
        throw new HttpsError('invalid-argument', 'El usuario o mensaje supera el tamaño permitido.');
    }

    // El precio forma parte de la economía del servidor; nunca se acepta desde el cliente.
    const costInt = ECONOMY.TTS_CROIN_COST;
    const streamerRef = db.collection('users').doc(streamer_uid);
    const cleanUsername = tiktok_username.startsWith('@') ? tiktok_username : `@${tiktok_username}`;
    let ecoVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Voz por defecto
    let transactionSuccess = false;
    let deductedPromo = 0;
    let deductedPurchased = 0;
    let earningsAdded = 0;
    let eventId = db.collection('admin').doc().id; // Ledger ID
    
    try {
        let donatorUid = null;
        let ecoVoiceExt = null;
        const txResult = await db.runTransaction(async (transaction) => {
            // 1. Buscar al usuario donador por su tiktok_username
            const usersQuery = await transaction.get(
                db.collection('users').where('tiktok_username', '==', cleanUsername.toLowerCase()).limit(1)
            );

            if (usersQuery.empty) {
                // FALLBACK: Usuario no registrado, degradar a Edge TTS
                return { needsDowngrade: true };
            }

            const userDoc = usersQuery.docs[0];
            const userRef = userDoc.ref;
            const userData = userDoc.data();

            if (!userData.has_eco_voice && !userData.eco_voice_id) {
                // FALLBACK: Usuario sin voz configurada, degradar a Edge TTS
                return { needsDowngrade: true };
            }

            donatorUid = userDoc.id;
            ecoVoiceExt = userData.eco_voice_extension || ".mp4";
            ecoVoiceId = userData.eco_voice_id || null;

            // 2. Verificar si el streamer existe
            const streamerDoc = await transaction.get(streamerRef);
            if (!streamerDoc.exists) {
                throw new HttpsError('not-found', 'Streamer no encontrado.');
            }

            // 3. Verificar saldo del donador
            const promotional = userData.promotional_croins || 0;
            const purchased = userData.purchased_croins || 0;
            
            if (promotional + purchased < costInt) {
                throw new HttpsError('failed-precondition', 'Saldo de Croins insuficiente.');
            }

            // 4. Calcular deducción de Croins
            let deductPromo = 0;
            let deductPurchased = 0;
            
            if (promotional >= costInt) {
                deductPromo = costInt;
            } else {
                deductPromo = promotional;
                deductPurchased = costInt - promotional;
            }

            // 5. Restar Croins al donador
            transaction.update(userRef, {
                promotional_croins: admin.firestore.FieldValue.increment(-deductPromo),
                purchased_croins: admin.firestore.FieldValue.increment(-deductPurchased)
            });

            // Escribir en Ledger del Donador (Gasto)
            const donatorTxRef = userRef.collection('transactions').doc(eventId);
            transaction.set(donatorTxRef, {
                type: 'tts_message_sent',
                amount: costInt,
                currency: 'croins',
                description: `Mensaje de voz enviado a ${streamer_uid}`,
                date: admin.firestore.FieldValue.serverTimestamp(),
                status: 'succeeded'
            });

            // 6. Si hubo deducción de purchased_croins, asignar regalías al streamer
            let earningsToAdd = 0;
            if (deductPurchased > 0) {
                earningsToAdd = deductPurchased * ECONOMY.CREATOR_COMMISSION_PERCENTAGE;
                transaction.update(streamerRef, {
                    creator_earnings: admin.firestore.FieldValue.increment(earningsToAdd)
                });

                // Escribir en Ledger del Streamer (Ingreso)
                const streamerTxRef = streamerRef.collection('transactions').doc(eventId);
                transaction.set(streamerTxRef, {
                    type: 'tts_message_received',
                    amount: earningsToAdd,
                    currency: 'croin_cash',
                    description: `Comisión por mensaje recibido de ${cleanUsername}`,
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'succeeded'
                });
            }

            deductedPromo = deductPromo;
            deductedPurchased = deductPurchased;
            earningsAdded = earningsToAdd;

            return { needsDowngrade: false };
        });
        
        if (txResult && txResult.needsDowngrade) {
            // Downgrade a Edge TTS (no llamamos a PremiumTTS ni descontamos Croins)
            await db.collection('tts_queue').doc(streamer_uid).collection('requests').add({
                tiktok_username: tiktok_username,
                message: message,
                use_edge: true,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, downgraded_to_edge: true };
        }
        
        transactionSuccess = true;
    } catch (error) {
        logger.error(`Error en processTTSMessage (transacción): ${error.message}`);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'No se pudo procesar el mensaje TTS.');
    }

    if (transactionSuccess) {
        let ephemeralVoiceId = null;
        try {
            let targetVoiceId = ecoVoiceId;
            
            // Si el usuario tiene una voz configurada en Storage pero no persistida en ElevenLabs, hacer clon efímero
            if (!targetVoiceId && donatorUid && ecoVoiceExt) {
                const bucket = getStorage().bucket();
                const filePath = `eco_voices/${donatorUid}/voice_sample${ecoVoiceExt}`;
                const file = bucket.file(filePath);
                
                const [audioBuffer] = await file.download();
                
                const form = new FormData();
                form.append('name', `Ephemeral_${donatorUid.substring(0, 8)}`);
                form.append('description', `Clon temporal para TTS`);
                form.append('files', audioBuffer, {
                    filename: `voice_sample${ecoVoiceExt}`
                });

                const addResponse = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
                    headers: {
                        ...form.getHeaders(),
                        'xi-api-key': PREMIUM_TTS_API_KEY
                    }
                });

                targetVoiceId = addResponse.data.voice_id;
                ephemeralVoiceId = targetVoiceId;
            }

            if (!targetVoiceId) {
                throw new Error("No se pudo obtener un ID de voz válido para sintetizar.");
            }

            // Llamada a la API de EcoVoices (PremiumTTS)
            const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
                text: message,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            }, {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': PREMIUM_TTS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            // Eliminar voz efímera para no saturar el límite de ElevenLabs
            if (ephemeralVoiceId) {
                axios.delete(`https://api.elevenlabs.io/v1/voices/${ephemeralVoiceId}`, {
                    headers: { 'xi-api-key': PREMIUM_TTS_API_KEY }
                }).catch(err => logger.error(`Error borrando voz efímera ${ephemeralVoiceId}: ${err.message}`));
            }

            const audioBase64 = Buffer.from(response.data).toString('base64');
            
            // Fase 5: Almacenar en la cola de TTS del Streamer en Firestore
            await db.collection('tts_queue').doc(streamer_uid).collection('requests').add({
                tiktok_username: cleanUsername,
                message: message,
                audioBase64: audioBase64,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };

        } catch (apiError) {
            // Eliminar voz efímera si ocurrió un error en TTS
            if (ephemeralVoiceId) {
                axios.delete(`https://api.elevenlabs.io/v1/voices/${ephemeralVoiceId}`, {
                    headers: { 'xi-api-key': PREMIUM_TTS_API_KEY }
                }).catch(err => logger.error(`Error borrando voz efímera en catch ${ephemeralVoiceId}: ${err.message}`));
            }

            logger.error(`Error con API de EcoVoices: ${apiError.message}`);
            // Revertir cobro
            await db.runTransaction(async (t) => {
                const donatorQuery = await t.get(db.collection('users').where('tiktok_username', '==', cleanUsername.toLowerCase()).limit(1));
                if (!donatorQuery.empty) {
                    t.update(donatorQuery.docs[0].ref, {
                        promotional_croins: admin.firestore.FieldValue.increment(deductedPromo),
                        purchased_croins: admin.firestore.FieldValue.increment(deductedPurchased)
                    });
                }
                if (earningsAdded > 0) {
                    t.update(streamerRef, {
                        creator_earnings: admin.firestore.FieldValue.increment(-earningsAdded)
                    });
                }
            });
            throw new HttpsError('internal', 'Error al generar el audio premium.');
        }
    }
});

// --- GESTIÓN DE USUARIOS ---

exports.updateUsername = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado para cambiar tu nombre de usuario.');
    }
    
    const uid = request.auth.uid;
    const { newUsername } = request.data;
    
    if (!newUsername || newUsername.trim().length < 3 || newUsername.trim().length > 20) {
        throw new HttpsError('invalid-argument', 'El nombre de usuario debe tener entre 3 y 20 caracteres.');
    }
    
    const displayUsername = newUsername.trim();
    // Reemplaza espacios con guiones bajos y deja solo letras/números/guiones para el ID único
    const normalizedUsername = displayUsername.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    if (normalizedUsername.length < 3) {
        throw new HttpsError('invalid-argument', 'El nombre de usuario contiene caracteres inválidos.');
    }

    try {
        await db.runTransaction(async (t) => {
            const userRef = db.collection('users').doc(uid);
            const userSnap = await t.get(userRef);
            
            if (!userSnap.exists) {
                throw new HttpsError('not-found', 'Usuario no encontrado.');
            }
            
            const userData = userSnap.data();
            const currentUsername = userData.username || '';
            const currentNormalized = currentUsername.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            
            if (currentUsername === displayUsername) {
                throw new HttpsError('already-exists', 'Ese ya es tu nombre de usuario actual.');
            }
            
            const isJustChangingCase = currentNormalized === normalizedUsername;
            
            // Verificar cooldown de 7 días (incluso si solo cambia mayúsculas)
            if (userData.last_username_change) {
                const lastChange = userData.last_username_change.toDate();
                const now = new Date();
                const diffTime = Math.abs(now - lastChange);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays <= 7) {
                    throw new HttpsError('failed-precondition', 'Solo puedes cambiar tu nombre de usuario 1 vez a la semana.');
                }
            }
            
            if (!isJustChangingCase) {
                // Verificar disponibilidad del nuevo nombre
                const newUsernameRef = db.collection('usernames').doc(normalizedUsername);
                const newUsernameSnap = await t.get(newUsernameRef);
                
                if (newUsernameSnap.exists) {
                    const newUsernameData = newUsernameSnap.data();
                    
                    // Si está reservado, revisar si ya expiró
                    if (newUsernameData.reserved_until) {
                        const reservedUntil = newUsernameData.reserved_until.toDate();
                        if (new Date() < reservedUntil && newUsernameData.original_owner !== uid) {
                            throw new HttpsError('already-exists', 'Este nombre de usuario está reservado temporalmente.');
                        }
                    } else {
                        // Está en uso activo por alguien más
                        if (newUsernameData.uid !== uid) {
                            throw new HttpsError('already-exists', 'El nombre de usuario ya está en uso.');
                        }
                    }
                }
                
                // Reservar el nombre actual por 14 días (si el usuario tenía uno)
                if (currentNormalized) {
                    const oldUsernameRef = db.collection('usernames').doc(currentNormalized);
                    const reserveDate = new Date();
                    reserveDate.setDate(reserveDate.getDate() + 14); // +14 días
                    
                    t.set(oldUsernameRef, {
                        uid: null,
                        original_owner: uid,
                        reserved_until: admin.firestore.Timestamp.fromDate(reserveDate)
                    });
                }
                
                // Tomar posesión del nuevo nombre
                t.set(newUsernameRef, {
                    uid: uid,
                    reserved_until: null,
                    original_owner: uid
                });
            }
            
            // Actualizar perfil de usuario con la versión que tiene espacios/mayúsculas
            t.update(userRef, {
                username: displayUsername,
                last_username_change: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        return { success: true, username: displayUsername };
    } catch (error) {
        logger.error('Error en updateUsername:', error);
        throw new HttpsError(error.code || 'internal', error.message || 'Error interno al actualizar el nombre de usuario.');
    }
});

// --- STRIPE CONNECT: ONBOARDING Y RETIROS ---

exports.createConnectAccount = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'Usuario no encontrado.');
    }

    const userData = userDoc.data();
    let accountId = userData.stripe_account_id;

    try {
        // Si no tiene cuenta, crearla
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'MX', // O el país predeterminado
                email: request.auth.token.email || undefined,
                capabilities: {
                    transfers: {requested: true},
                },
                business_type: 'individual',
            });
            accountId = account.id;
            await userRef.update({ stripe_account_id: accountId });
        }

        // Crear link de validación KYC (Account Link)
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: 'https://talking-crow.web.app/withdraw', // O localhost en dev
            return_url: 'https://talking-crow.web.app/withdraw',
            type: 'account_onboarding',
        });

        return { url: accountLink.url };
    } catch (error) {
        logger.error(`Error en createConnectAccount: ${error.message}`, error);
        throw new HttpsError('internal', 'No se pudo iniciar la configuración de retiros.');
    }
});

exports.checkStripeAccountStatus = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) return { success: false };
    const userData = userDoc.data();
    if (!userData.stripe_account_id) return { success: false, status: 'no_account' };

    try {
        const account = await stripe.accounts.retrieve(userData.stripe_account_id);
        const chargesEnabled = account.charges_enabled;
        const detailsSubmitted = account.details_submitted;

        if (userData.stripe_charges_enabled !== chargesEnabled || userData.stripe_details_submitted !== detailsSubmitted) {
            await userRef.update({ 
                stripe_charges_enabled: chargesEnabled,
                stripe_details_submitted: detailsSubmitted 
            });
        }
        return { success: true, chargesEnabled, detailsSubmitted };
    } catch (error) {
        logger.error(`Error verificando cuenta de stripe para ${uid}:`, error);
        throw new HttpsError('internal', 'Error verificando estado de Stripe.');
    }
});

exports.requestPayout = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const payoutId = db.collection('users').doc(uid).collection('transactions').doc().id;

    let accountId = null;
    let earnings = 0;

    let earningsMxn = 0;
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado.');

            const userData = userDoc.data();
            earnings = userData.creator_earnings || 0;
            accountId = userData.stripe_account_id;
            const chargesEnabled = userData.stripe_charges_enabled;

            // Fase 4: Conversión de Croins a MXN
            const croinsFloor = Math.floor(earnings);
            earningsMxn = croinsFloor * ECONOMY.CROIN_TO_MXN_RATE;

            if (earningsMxn < ECONOMY.MIN_PAYOUT_MXN) {
                throw new HttpsError('failed-precondition', `El retiro mínimo es de $${ECONOMY.MIN_PAYOUT_MXN} MXN.`);
            }

            if (userData.last_payout_date) {
                const lastDate = userData.last_payout_date.toDate();
                const now = new Date();
                const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
                if (diffDays < ECONOMY.PAYOUT_COOLDOWN_DAYS) {
                    throw new HttpsError('failed-precondition', `Solo se permite 1 retiro cada ${ECONOMY.PAYOUT_COOLDOWN_DAYS} días.`);
                }
            }

            if (!accountId || !chargesEnabled) {
                throw new HttpsError('failed-precondition', 'Cuenta bancaria no vinculada o no verificada por Stripe.');
            }

            // Deducir saldo y actualizar fecha de retiro
            // Se resta solo lo que se convirtió, dejando el saldo fraccionario (si lo hay)
            transaction.update(userRef, {
                creator_earnings: admin.firestore.FieldValue.increment(-croinsFloor),
                last_payout_date: admin.firestore.FieldValue.serverTimestamp()
            });

            // Crear registro pendiente
            const txRef = userRef.collection('transactions').doc(payoutId);
            transaction.set(txRef, {
                type: 'payout',
                amount: earningsMxn,
                currency: 'mxn',
                description: `Retiro de ganancias a cuenta bancaria`,
                date: admin.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });
        });
    } catch (e) {
        throw new HttpsError(e.code || 'internal', e.message || 'Error en la transacción local.');
    }

    // Ejecutar Transferencia Stripe con Idempotency Key (Fase 4)
    try {
        const transfer = await stripe.transfers.create({
            amount: Math.floor(earningsMxn * 100), // MXN en centavos
            currency: 'mxn',
            destination: accountId,
            description: 'Retiro de ganancias Talking Crow'
        }, {
            idempotencyKey: payoutId
        });

        // Marcar como exitoso
        await userRef.collection('transactions').doc(payoutId).update({
            status: 'succeeded',
            stripe_transfer_id: transfer.id
        });

        return { success: true, amount: earningsMxn };

    } catch (stripeError) {
        logger.error(`Error en transferencia de Stripe para ${uid}:`, stripeError);
        
        // Revertir el saldo si Stripe falló
        await db.runTransaction(async (transaction) => {
            transaction.update(userRef, {
                creator_earnings: admin.firestore.FieldValue.increment(earnings),
                // Para simplificar, borramos el last_payout_date para que puedan intentar de nuevo
                last_payout_date: admin.firestore.FieldValue.delete()
            });
            const txRef = userRef.collection('transactions').doc(payoutId);
            transaction.update(txRef, {
                status: 'failed',
                error_details: stripeError.message
            });
        });

        throw new HttpsError('internal', 'Falló la transferencia bancaria. Los fondos fueron devueltos a tu cuenta.');
    }
});

exports.stripeWebhook = onRequest((req, res) => {
    cors(req, res, async () => {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;
        try {
            // Firebase Functions v2 onRequest expone req.rawBody
            event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
        } catch (err) {
            logger.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(400).send('Webhook signature verification failed');
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const uid = paymentIntent.metadata.donador_uid;
            const packageId = paymentIntent.metadata.packageId;
            const pack = PACKAGES[packageId];
            const expectedAmount = pack ? pack.price_mxn * 100 : 0;
            const paymentIsValid = Boolean(
                uid && pack &&
                paymentIntent.currency === 'mxn' &&
                paymentIntent.amount_received === expectedAmount
            );
            const croinsToAdd = pack?.croins;
            const eventId = event.id; // ID único del evento en Stripe

            if (paymentIsValid) {
                try {
                    const eventRef = db.collection("processed_events").doc(eventId);
                    const userRef = db.collection("users").doc(uid);

                    // TC-05: Transacción para Idempotencia (prevenir saldos duplicados)
                    await db.runTransaction(async (transaction) => {
                        const eventDoc = await transaction.get(eventRef);
                        if (eventDoc.exists) {
                            logger.warn(`⚠️ Webhook: Evento duplicado ignorado (${eventId}).`);
                            return;
                        }

                        // Marcar como procesado
                        transaction.set(eventRef, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
                        
                        // Añadir los Croins
                        transaction.set(userRef, {
                            purchased_croins: admin.firestore.FieldValue.increment(croinsToAdd),
                            last_purchase: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                        
                        // Guardar en el historial de transacciones
                        const txRef = db.collection('users').doc(uid).collection('transactions').doc(eventId);
                        transaction.set(txRef, {
                            type: 'croins_purchase',
                            amount: expectedAmount / 100,
                            currency: 'mxn',
                            description: `Compra de ${croinsToAdd} Croins`,
                            date: admin.firestore.FieldValue.serverTimestamp(),
                            status: 'succeeded'
                        });

                        // Actualizar contabilidad de la plataforma
                        const statsRef = db.collection('admin').doc('stats');
                        const amountInMXN = expectedAmount / 100;
                        const netEstimate = amountInMXN - (3 + (amountInMXN * 0.036)); // Estimación Stripe
                        
                        transaction.set(statsRef, {
                            platform_profit: {
                                total_gross_mxn: admin.firestore.FieldValue.increment(amountInMXN),
                                total_estimated_net_mxn: admin.firestore.FieldValue.increment(netEstimate > 0 ? netEstimate : 0)
                            }
                        }, { merge: true });
                    });
                    
                    logger.info(`✅ Webhook: Se añadieron ${croinsToAdd} Croins comprados al UID: ${uid}`);
                } catch (dbErr) {
                    logger.error(`❌ Webhook Error actualizando DB: ${dbErr.message}`);
                    // TC-06: Lanzar HTTP 500 para forzar a Stripe a reintentar si Firestore falló
                    return res.status(500).send('Database Error');
                }
            } else {
                logger.error(`Webhook rechazado por datos inconsistentes. Evento: ${eventId}, paquete: ${packageId || 'ausente'}.`);
            }
        } else if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            if (session.mode === 'subscription' && session.metadata.uid) {
                // Pasamos el UID de la sesión a la suscripción
                await stripe.subscriptions.update(session.subscription, {
                    metadata: { uid: session.metadata.uid }
                });
            }
        } else if (event.type === 'invoice.payment_succeeded') {
            const invoice = event.data.object;
            if (invoice.subscription) {
                const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
                const uid = subscription.metadata.uid;
                const eventId = event.id;

                if (uid) {
                    try {
                        const eventRef = db.collection("processed_events").doc(eventId);
                        const userRef = db.collection("users").doc(uid);

                        await db.runTransaction(async (transaction) => {
                            const eventDoc = await transaction.get(eventRef);
                            if (eventDoc.exists) { return; }

                            transaction.set(eventRef, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
                            
                            const expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 30); // 30 días de duración
                            
                            transaction.set(userRef, {
                                creator_credits: admin.firestore.FieldValue.increment(1000),
                                isPro: true,
                                pro_expires_at: expiresAt,
                                last_subscription_payment: admin.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                            
                            // Guardar en el historial de transacciones
                            const txRef = db.collection('users').doc(uid).collection('transactions').doc(eventId);
                            transaction.set(txRef, {
                                type: 'pro_subscription',
                                amount: invoice.amount_paid / 100,
                                currency: 'mxn',
                                description: 'Suscripción Plan Pro - 1000 Créditos',
                                date: admin.firestore.FieldValue.serverTimestamp(),
                                status: 'succeeded'
                            });

                            // Actualizar contabilidad de la plataforma
                            const statsRef = db.collection('admin').doc('stats');
                            const amountInMXN = invoice.amount_paid / 100;
                            const netEstimate = amountInMXN - (3 + (amountInMXN * 0.036)); // Estimación Stripe
                            
                            transaction.set(statsRef, {
                                platform_profit: {
                                    total_gross_mxn: admin.firestore.FieldValue.increment(amountInMXN),
                                    total_estimated_net_mxn: admin.firestore.FieldValue.increment(netEstimate > 0 ? netEstimate : 0)
                                }
                            }, { merge: true });
                        });
                        logger.info(`✅ Webhook: Se recargaron 1000 Créditos IA al UID: ${uid}`);
                    } catch (dbErr) {
                        logger.error(`❌ Webhook Error DB: ${dbErr.message}`);
                        return res.status(500).send('Database Error');
                    }
                }
            }
        } else if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
            const object = event.data.object;
            const subscriptionId = event.type === 'customer.subscription.deleted' ? object.id : object.subscription;
            const eventId = event.id;
            if (subscriptionId) {
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const uid = subscription.metadata.uid;
                if (uid) {
                    try {
                        const eventRef = db.collection("processed_events").doc(eventId);
                        const userRef = db.collection("users").doc(uid);

                        await db.runTransaction(async (transaction) => {
                            const eventDoc = await transaction.get(eventRef);
                            if (eventDoc.exists) { return; }

                            transaction.set(eventRef, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
                            
                            transaction.set(userRef, {
                                isPro: false,
                                pro_expires_at: admin.firestore.FieldValue.delete()
                            }, { merge: true });
                            
                            // Guardar en el historial de transacciones
                            const txRef = userRef.collection('transactions').doc(eventId);
                            transaction.set(txRef, {
                                type: 'pro_subscription_revoked',
                                amount: 0,
                                currency: 'none',
                                description: `Suscripción Pro cancelada o fallo de pago`,
                                date: admin.firestore.FieldValue.serverTimestamp(),
                                status: 'succeeded'
                            });
                        });
                        logger.info(`Webhook: Suscripción terminada/fallida para el UID: ${uid}. isPro revocado de forma segura.`);
                    } catch (dbErr) {
                        logger.error(`Error revocando isPro de forma segura: ${dbErr.message}`);
                        return res.status(500).send('Database Error');
                    }
                }
            }
        }

        return res.json({received: true});
    });
});

// ---------------------------------------------------------
// Consumo de Features (Economía unificada)
// ---------------------------------------------------------
exports.consumeFeature = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }
    // No existen consumidores activos ni un catálogo de precios del servidor.
    // Aceptar feature_type/cost del navegador permitiría comprar cualquier
    // función por un valor arbitrario.
    throw new HttpsError(
        'failed-precondition',
        'Esta función permanece deshabilitada hasta contar con un catálogo de precios del servidor.'
    );
});

// TC-25: La función migrateLegacyUsers fue eliminada por motivos de seguridad.

// ---------------------------------------------------------
// Clonación de Voz (EcoVoices) con PremiumTTS
// ---------------------------------------------------------
exports.createEcoVoice = onCall({
    enforceAppCheck: false,
    maxInstances: 10,
    cors: true,
    timeoutSeconds: 120 // PremiumTTS puede tardar un poco clonando
}, async (request) => {
    // 1. Verificaciones básicas
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError('unauthenticated', 'Debes estar logueado para crear una voz.');
    }
    
    const uid = request.auth.uid;
    const rateLimitRef = db.collection('security_limits').doc(`eco_voice_${uid}`);
    const cooldownMs = 10 * 60 * 1000;
    await db.runTransaction(async (transaction) => {
        const limitDoc = await transaction.get(rateLimitRef);
        const lastAttemptAt = limitDoc.data()?.lastAttemptAt;
        if (lastAttemptAt?.toMillis && Date.now() - lastAttemptAt.toMillis() < cooldownMs) {
            throw new HttpsError(
                'resource-exhausted',
                'Espera 10 minutos antes de intentar crear otra voz.'
            );
        }
        transaction.set(rateLimitRef, {
            uid,
            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });

    const requestData = request.data || {};
    const base64Audio = requestData.base64Audio || requestData.audioBase64;
    const fileName = (requestData.fileName || '').toLowerCase();
    let mimeType = requestData.mimeType;
    if (!mimeType) {
        if (fileName.endsWith('.mp3')) mimeType = 'audio/mpeg';
        else if (fileName.endsWith('.wav')) mimeType = 'audio/wav';
        else if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4')) mimeType = 'audio/mp4';
        else if (fileName.endsWith('.ogg')) mimeType = 'audio/ogg';
        else mimeType = 'audio/webm';
    }
    const extensionByMime = {
        'audio/mpeg': '.mp3',
        'audio/mp3': '.mp3',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav',
        'audio/mp4': '.m4a',
        'audio/m4a': '.m4a',
        'audio/x-m4a': '.m4a',
        'audio/aac': '.aac',
        'audio/webm': '.webm',
        'audio/ogg': '.ogg'
    };
    const maxAudioBytes = 10 * 1024 * 1024;
    const maxBase64Chars = Math.ceil(maxAudioBytes / 3) * 4 + 4;

    const baseMimeType = mimeType.split(';')[0].trim();
    if (typeof base64Audio !== 'string' || !base64Audio || !extensionByMime[baseMimeType]) {
        throw new HttpsError('invalid-argument', 'Faltan los datos del audio o el formato (' + mimeType + ') no es soportado.');
    }
    if (base64Audio.length > maxBase64Chars || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Audio)) {
        throw new HttpsError('invalid-argument', 'El audio no tiene un formato Base64 válido o supera 10 MB.');
    }

    if (!PREMIUM_TTS_API_KEY) {
        logger.error("No hay PREMIUM_TTS_API_KEY configurada en el servidor.");
        throw new HttpsError('internal', 'El servicio de clonación de voz está inactivo.');
    }

    try {
        logger.info(`Iniciando clonación de voz para el usuario ${uid}`);
        
        // 2. Decodificar el audio a un Buffer
        const audioBuffer = Buffer.from(base64Audio, 'base64');
        if (!audioBuffer.length || audioBuffer.length > maxAudioBytes) {
            throw new HttpsError('invalid-argument', 'El audio está vacío o supera 10 MB.');
        }
        
        // 2.5. Guardar el audio original en Firebase Storage para respaldos a largo plazo
        const ext = extensionByMime[baseMimeType];
        try {
            const bucket = getStorage().bucket();
            const filePath = `eco_voices/${uid}/voice_sample${ext}`;
            const file = bucket.file(filePath);
            await file.save(audioBuffer, {
                contentType: mimeType,
                metadata: {
                    metadata: {
                        uid: uid,
                        createdAt: new Date().toISOString()
                    }
                }
            });
            logger.info(`Audio de voz guardado en Storage exitosamente para ${uid} en la ruta: ${filePath}`);
        } catch (storageError) {
            logger.error(`No se pudo guardar el audio en Storage para ${uid}. Error: ${storageError.message}`);
            throw new HttpsError('internal', 'No se pudo guardar el audio en el Storage.');
        }
        
        // 5. Actualizar el documento del usuario en Firestore (sin clonar aún)
        const userRef = db.collection('users').doc(uid);
        await userRef.update({
            has_eco_voice: true,
            eco_voice_extension: ext,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
        
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.error(`Error procesando subida de voz para ${uid}: ${error.message}`);
        throw new HttpsError('internal', 'Error al procesar la subida del archivo de voz.');
    }
});

// ---------------------------------------------------------
// Herramientas de Superusuario (Admin DEV)
// ---------------------------------------------------------
exports.adminAddCredits = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    
    try {
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'Usuario no encontrado.');
            }
            
            // Verificamos si el correo es uno de los autorizados
            const adminDoc = await db.collection('users').doc(request.auth.uid).get(); if (!adminDoc.exists || adminDoc.data().isAdmin !== true) {
                throw new HttpsError('permission-denied', 'No eres superusuario (correo no autorizado).');
            }
            
            t.update(userRef, {
                promotional_croins: admin.firestore.FieldValue.increment(35),
                creator_credits: admin.firestore.FieldValue.increment(35)
            });
        });
        return { success: true };
    } catch (error) {
        logger.error(`Error en adminAddCredits: ${error.message}`);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'No se pudieron acreditar las monedas de superusuario.');
    }
});

exports.getAdminStats = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const adminDoc = await db.collection('users').doc(request.auth.uid).get(); if (!adminDoc.exists || adminDoc.data().isAdmin !== true) {
        throw new HttpsError('permission-denied', 'No eres administrador.');
    }

    try {
        const statsDoc = await db.collection('admin').doc('stats').get();
        if (!statsDoc.exists) {
            return {
                platform_profit: {
                    total_gross_mxn: 0,
                    total_estimated_net_mxn: 0
                }
            };
        }
        return statsDoc.data();
    } catch (error) {
        throw new HttpsError('internal', error.message);
    }
});

// --- AUTENTICACIÓN DESKTOP (Proxy) ---
exports.getDesktopTokenHandler = functionsV1.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const authHeader = req.headers.authorization || '';
            if (!authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            
            const customToken = await admin.auth().createCustomToken(uid);
            res.json({ token: customToken });
        } catch (error) {
            logger.error(`Error en getDesktopTokenHandler: ${error.message}`);
            res.status(500).json({ error: 'Failed to generate token' });
        }
    });
});

// ---------------------------------------------------------
// Verificación segura de disponibilidad de username (TC-49)
// ---------------------------------------------------------
exports.checkUsernameAvailability = onCall({ enforceAppCheck: false }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const username = request.data?.username;
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 24) {
        throw new HttpsError('invalid-argument', 'El nombre de usuario debe tener entre 3 y 24 caracteres.');
    }

    const clean = username.trim().toLowerCase();
    // Validar formato: solo alfanuméricos, guiones bajos y puntos
    if (!/^[a-z0-9_.]+$/.test(clean)) {
        throw new HttpsError('invalid-argument', 'Solo se permiten letras, números, puntos y guiones bajos.');
    }

    try {
        const docRef = db.collection('usernames').doc(clean);
        const docSnap = await docRef.get();
        return { available: !docSnap.exists };
    } catch (error) {
        logger.error('Error verificando username:', error);
        throw new HttpsError('internal', 'Error al verificar disponibilidad.');
    }
});







exports.downloadApp = onRequest(async (request, response) => {
    try {
        const fetchResponse = await fetch('https://api.github.com/repos/Roblelu/Talking_Cro.ow/releases/latest');
        const data = await fetchResponse.json();
        const exeAsset = data.assets.find(a => a.name.endsWith('.exe') && !a.name.includes('uninstaller'));
        if (exeAsset) {
            response.redirect(302, exeAsset.browser_download_url);
        } else {
            response.redirect(302, 'https://github.com/Roblelu/Talking_Cro.ow/releases/latest');
        }
    } catch (e) {
        response.redirect(302, 'https://github.com/Roblelu/Talking_Cro.ow/releases/latest');
    }
});

exports.generateCoupons = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Acceso denegado.');
    const adminDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().isAdmin !== true) {
        throw new HttpsError('permission-denied', 'No eres superusuario.');
    }
    
    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 10; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return code;
    };
    
    const batch = db.batch();
    const codesCreated = [];
    
    const now = new Date();
    const expiresDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiresAt = admin.firestore.Timestamp.fromDate(expiresDate);
    
    for (let i = 0; i < 25; i++) {
        const code = generateCode();
        batch.set(db.collection('coupons').doc(code), {
            amount: 96,
            redeemed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt
        });
        codesCreated.push({ code, amount: 96 });
    }
    
    for (let i = 0; i < 50; i++) {
        const code = generateCode();
        batch.set(db.collection('coupons').doc(code), {
            amount: 24,
            redeemed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: expiresAt
        });
        codesCreated.push({ code, amount: 24 });
    }
    
    await batch.commit();
    return { success: true, coupons: codesCreated };
});

exports.redeemCoupon = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión para canjear un cupón.');
    const code = request.data.code?.trim().toUpperCase();
    if (!code) throw new HttpsError('invalid-argument', 'Código inválido.');
    
    const result = await db.runTransaction(async (t) => {
        const couponRef = db.collection('coupons').doc(code);
        const couponDoc = await t.get(couponRef);
        
        if (!couponDoc.exists) {
            throw new HttpsError('not-found', 'Cupón no encontrado o inválido.');
        }
        
        const data = couponDoc.data();
        
        if (data.redeemed) {
            throw new HttpsError('failed-precondition', 'Este cupón ya ha sido canjeado.');
        }
        
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
            throw new HttpsError('failed-precondition', 'Este cupón ha expirado.');
        }
        
        t.update(couponRef, {
            redeemed: true,
            redeemedBy: request.auth.uid,
            redeemedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const userRef = db.collection('users').doc(request.auth.uid);
        t.update(userRef, {
            promotional_croins: admin.firestore.FieldValue.increment(data.amount)
        });
        
        return data.amount;
    });
    
    return { success: true, amount: result };
});


exports.fixCors = onRequest(async (req, res) => {
  try {
    const bucket = getStorage().bucket('talking-crow.firebasestorage.app');
    await bucket.setCorsConfiguration([{
      origin: ['*'],
      method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
      maxAgeSeconds: 3600,
      responseHeader: ['*']
    }]);
    res.send('CORS arreglado con exito para Firebase Storage. Ya puedes cerrar esta ventana.');
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

exports.testClonedVoiceWeb = onCall({
    enforceAppCheck: false,
    maxInstances: 10,
    timeoutSeconds: 30
}, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes estar autenticado para probar tu voz.');
    const { text } = request.data || {};
    if (!text || typeof text !== 'string' || text.trim().length > 150) {
        throw new HttpsError('invalid-argument', 'El texto debe ser entre 1 y 150 caracteres.');
    }
    if (!PREMIUM_TTS_API_KEY) throw new HttpsError('internal', 'Servicio TTS no configurado.');

    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);
    const costInt = ECONOMY.TTS_CROIN_COST; // 12 Croins
    
    // 1. Deducir saldo
    let voiceId = null;
    await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado.');
        const userData = userDoc.data();
        voiceId = userData.eco_voice_id;
        if (!voiceId) throw new HttpsError('failed-precondition', 'No tienes una voz configurada.');
        
        const promotional = userData.promotional_croins || 0;
        const purchased = userData.purchased_croins || 0;
        if (promotional + purchased < costInt) {
            throw new HttpsError('failed-precondition', 'Saldo insuficiente. Cuesta 12 Croins probar la voz.');
        }

        let deductPromo = 0, deductPurchased = 0;
        if (promotional >= costInt) { deductPromo = costInt; } 
        else { deductPromo = promotional; deductPurchased = costInt - promotional; }

        t.update(userRef, {
            promotional_croins: admin.firestore.FieldValue.increment(-deductPromo),
            purchased_croins: admin.firestore.FieldValue.increment(-deductPurchased)
        });
        
        const txRef = userRef.collection('transactions').doc();
        t.set(txRef, {
            type: 'web_tts_test', amount: costInt, currency: 'croins',
            description: 'Prueba de voz en la web', date: admin.firestore.FieldValue.serverTimestamp(), status: 'succeeded'
        });
    });

    // 2. Generar Audio con ElevenLabs
    try {
        const response = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
            text: text, model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        }, {
            headers: { 'Accept': 'audio/mpeg', 'xi-api-key': PREMIUM_TTS_API_KEY, 'Content-Type': 'application/json' },
            responseType: 'arraybuffer'
        });
        
        const base64Audio = Buffer.from(response.data, 'binary').toString('base64');
        return { success: true, audioBase64: 'data:audio/mpeg;base64,' + base64Audio };
    } catch (err) {
        // En un sistema real reembolsariamos, pero para beta esto es suficiente.
        logger.error('Error generando TTS Web:', err.message);
        throw new HttpsError('internal', 'No se pudo generar el audio.');
    }
});
