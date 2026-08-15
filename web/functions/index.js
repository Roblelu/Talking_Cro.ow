const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors")({ origin: true });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

admin.initializeApp();
const db = admin.firestore();

// Configuración de las APIs protegidas
// Extraemos las variables de entorno que subiremos a Firebase
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// El cliente actual no aporta una prueba firmada que vincule al autor del chat
// de TikTok con una cuenta de Firebase. Mantener el cobro activo permitiría que
// un streamer eligiera qué cuenta registrada paga el mensaje.
const PREMIUM_TTS_BILLING_ENABLED = true;

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
    'pack_8': { price_mxn: 399, croins: 2700 }
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

exports.claimWelcomeCredits = onCall(async (request) => {
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

exports.processTTSMessage = onCall(async (request) => {
    // TC-34: Validación estricta de identidad para evitar robo de saldo (Opción A)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Acceso denegado: Se requiere autenticación.');
    }

    if (!PREMIUM_TTS_BILLING_ENABLED) {
        throw new HttpsError(
            'failed-precondition',
            'El TTS premium está temporalmente deshabilitado hasta validar la identidad del donador.'
        );
    }

    // Esta función es llamada desde el cliente cuando un fan envía un mensaje de chat
    const { tiktok_username, streamer_uid, message } = request.data || {};
    
    if (typeof tiktok_username !== 'string' || typeof streamer_uid !== 'string' || typeof message !== 'string' ||
        !tiktok_username.trim() || !streamer_uid.trim() || !message.trim()) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos (tiktok_username, streamer_uid, message).');
    }
    if (tiktok_username.length > 80 || message.length > 300) {
        throw new HttpsError('invalid-argument', 'El usuario o mensaje supera el tamaño permitido.');
    }

    // Verificamos que el streamer solo pueda cobrar donaciones dirigidas a sí mismo
    if (request.auth.uid !== streamer_uid) {
        throw new HttpsError('permission-denied', 'No tienes permiso para acreditar Croins a otro streamer.');
    }

    // El precio forma parte de la economía del servidor; nunca se acepta desde el cliente.
    const costInt = 12;
    const streamerRef = db.collection('users').doc(streamer_uid);
    const cleanUsername = tiktok_username.startsWith('@') ? tiktok_username : `@${tiktok_username}`;
    let ecoVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Voz por defecto
    let transactionSuccess = false;
    let deductedPromo = 0;
    let deductedPurchased = 0;
    let earningsAdded = 0;
    
    try {
        await db.runTransaction(async (transaction) => {
            // 1. Buscar al usuario donador por su tiktok_username
            const usersQuery = await transaction.get(
                db.collection('users').where('tiktok_username', '==', cleanUsername.toLowerCase()).limit(1)
            );

            if (usersQuery.empty) {
                throw new HttpsError('not-found', 'El usuario de TikTok no está registrado en la base de datos.');
            }

            const userDoc = usersQuery.docs[0];
            const userRef = userDoc.ref;
            const userData = userDoc.data();

            if (userData.eco_voice_id) {
                ecoVoiceId = userData.eco_voice_id;
            }

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

            transaction.update(userRef, {
                promotional_croins: admin.firestore.FieldValue.increment(-deductPromo),
                purchased_croins: admin.firestore.FieldValue.increment(-deductPurchased)
            });

            // 5. Calcular ganancias para el creador (Revenue Split)
            let earningsToAdd = 0;
            if (deductPurchased > 0) {
                const percentage = 0.05; 
                const baseValue = (deductPurchased / 12) * 5.00;
                earningsToAdd = baseValue * percentage; 
            }

            if (earningsToAdd > 0) {
                transaction.update(streamerRef, {
                    creator_earnings: admin.firestore.FieldValue.increment(earningsToAdd)
                });
            }

            deductedPromo = deductPromo;
            deductedPurchased = deductPurchased;
            earningsAdded = earningsToAdd;
        });
        
        transactionSuccess = true;
    } catch (error) {
        logger.error(`Error en processTTSMessage (transacción): ${error.message}`);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'No se pudo procesar el mensaje TTS.');
    }

    if (transactionSuccess) {
        try {
            // Llamada a la API de EcoVoices (ElevenLabs)
            const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${ecoVoiceId}`, {
                text: message,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            }, {
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer'
            });

            const audioBase64 = Buffer.from(response.data, 'binary').toString('base64');
            return { success: true, audioBase64 };

        } catch (apiError) {
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
    
    if (!newUsername || newUsername.length < 3 || newUsername.length > 20) {
        throw new HttpsError('invalid-argument', 'El nombre de usuario debe tener entre 3 y 20 caracteres.');
    }
    
    const cleanNewUsername = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    
    if (cleanNewUsername !== newUsername.trim().toLowerCase()) {
        throw new HttpsError('invalid-argument', 'El nombre de usuario solo puede contener letras, números y guiones bajos.');
    }

    try {
        await db.runTransaction(async (t) => {
            const userRef = db.collection('users').doc(uid);
            const userSnap = await t.get(userRef);
            
            if (!userSnap.exists) {
                throw new HttpsError('not-found', 'Usuario no encontrado.');
            }
            
            const userData = userSnap.data();
            const currentUsername = userData.username;
            
            if (currentUsername === cleanNewUsername) {
                throw new HttpsError('already-exists', 'Ese ya es tu nombre de usuario actual.');
            }
            
            // Verificar cooldown de 7 días
            if (userData.last_username_change) {
                const lastChange = userData.last_username_change.toDate();
                const now = new Date();
                const diffTime = Math.abs(now - lastChange);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                if (diffDays <= 7) {
                    throw new HttpsError('failed-precondition', 'Solo puedes cambiar tu nombre de usuario 1 vez a la semana.');
                }
            }
            
            // Verificar disponibilidad del nuevo nombre
            const newUsernameRef = db.collection('usernames').doc(cleanNewUsername);
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
            
            // Todo bien, proceder con el cambio
            
            // 1. Reservar el nombre actual por 14 días (si el usuario tenía uno)
            if (currentUsername) {
                const oldUsernameRef = db.collection('usernames').doc(currentUsername);
                const reserveDate = new Date();
                reserveDate.setDate(reserveDate.getDate() + 14); // +14 días
                
                t.set(oldUsernameRef, {
                    uid: null,
                    original_owner: uid,
                    reserved_until: admin.firestore.Timestamp.fromDate(reserveDate)
                });
            }
            
            // 2. Tomar posesión del nuevo nombre
            t.set(newUsernameRef, {
                uid: uid,
                reserved_until: null,
                original_owner: uid
            });
            
            // 3. Actualizar perfil de usuario
            t.update(userRef, {
                username: cleanNewUsername,
                last_username_change: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        
        return { success: true, username: cleanNewUsername };
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

exports.requestPayout = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    // Mitigación segura: una transferencia externa nunca debe ejecutarse dentro
    // de una transacción reintentable de Firestore. Se mantiene cerrada hasta
    // implementar un ledger/idempotency key y reconciliación por webhook.
    throw new HttpsError(
        'failed-precondition',
        'Los retiros están temporalmente deshabilitados mientras se actualiza su seguridad.'
    );
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
                            
                            transaction.set(userRef, {
                                creator_credits: admin.firestore.FieldValue.increment(1000),
                                isPro: true,
                                last_subscription_payment: admin.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                        });
                        logger.info(`✅ Webhook: Se recargaron 1000 Créditos IA al UID: ${uid}`);
                    } catch (dbErr) {
                        logger.error(`❌ Webhook Error DB: ${dbErr.message}`);
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
// Clonación de Voz (EcoVoices) con ElevenLabs
// ---------------------------------------------------------
exports.createEcoVoice = onCall({
    maxInstances: 10,
    cors: true,
    timeoutSeconds: 120 // ElevenLabs puede tardar un poco clonando
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
    const mimeType = requestData.mimeType || 'audio/webm';
    const extensionByMime = {
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/x-wav': '.wav',
        'audio/mp4': '.m4a',
        'audio/webm': '.webm'
    };
    const maxAudioBytes = 10 * 1024 * 1024;
    const maxBase64Chars = Math.ceil(maxAudioBytes / 3) * 4 + 4;

    if (typeof base64Audio !== 'string' || !base64Audio || !extensionByMime[mimeType]) {
        throw new HttpsError('invalid-argument', 'Faltan los datos del audio.');
    }
    if (base64Audio.length > maxBase64Chars || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64Audio)) {
        throw new HttpsError('invalid-argument', 'El audio no tiene un formato Base64 válido o supera 10 MB.');
    }

    if (!ELEVENLABS_API_KEY) {
        logger.error("No hay ELEVENLABS_API_KEY configurada en el servidor.");
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
        try {
            const bucket = admin.storage().bucket();
            const filePath = `eco_voices/${uid}/voice_sample${extensionByMime[mimeType]}`;
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
            logger.warn(`No se pudo guardar el audio en Storage para ${uid}. Error: ${storageError.message}`);
            // Continuamos de todos modos porque lo importante es enviarlo a ElevenLabs
        }
        
        // 3. Preparar FormData para ElevenLabs
        const form = new FormData();
        form.append('name', `EcoVoice_${uid.substring(0, 8)}`);
        form.append('description', `Clon de voz para el usuario ${uid} en Talking Cro.ow`);
        form.append('files', audioBuffer, {
            filename: `voice_sample${extensionByMime[mimeType]}`,
            contentType: mimeType
        });

        // 4. Llamada a ElevenLabs API (Add Voice)
        const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
            headers: {
                ...form.getHeaders(),
                'xi-api-key': ELEVENLABS_API_KEY
            }
        });

        const voiceId = response.data.voice_id;
        
        if (!voiceId) {
            throw new Error("ElevenLabs no devolvió un voice_id válido.");
        }
        
        logger.info(`Voz clonada exitosamente para ${uid}.`);

        // 5. Actualizar el documento del usuario en Firestore
        const userRef = db.collection('users').doc(uid);
        await userRef.update({
            eco_voice_id: voiceId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, voice_id: voiceId };
        
    } catch (error) {
        if (error instanceof HttpsError) throw error;
        logger.error(`Error clonando voz para ${uid}: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
        throw new HttpsError('internal', 'Error al procesar el clonado de voz con el proveedor.');
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
            const email = request.auth.token.email;
            const allowedEmails = ['cnkrxdu@gmail.com', 'roblecro.ow@gmail.com'];
            
            if (!email || !allowedEmails.includes(email.toLowerCase())) {
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
