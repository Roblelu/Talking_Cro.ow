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
const EULER_KEY = process.env.EULER_KEY;

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
        throw new HttpsError('internal', error.message);
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
        throw new HttpsError('internal', error.message);
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
        throw new HttpsError('internal', error.message);
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
        throw new HttpsError('internal', error.message);
    }
});

exports.processTTSMessage = onCall(async (request) => {
    // TC-34: Validación estricta de identidad para evitar robo de saldo (Opción A)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Acceso denegado: Se requiere autenticación.');
    }

    // Esta función es llamada desde el backend (Python) cuando un fan envía un mensaje de chat
    const { tiktok_username, streamer_uid, cost = 12 } = request.data;
    
    if (!tiktok_username || !streamer_uid) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos (tiktok_username, streamer_uid).');
    }

    // Verificamos que el streamer solo pueda cobrar donaciones dirigidas a sí mismo
    if (request.auth.uid !== streamer_uid) {
        throw new HttpsError('permission-denied', 'No tienes permiso para acreditar Croins a otro streamer.');
    }

    const costInt = parseInt(cost, 10);
    const streamerRef = db.collection('users').doc(streamer_uid);
    
    try {
        await db.runTransaction(async (transaction) => {
            // 1. Buscar al usuario donador por su tiktok_username
            const cleanUsername = tiktok_username.startsWith('@') ? tiktok_username : `@${tiktok_username}`;
            const usersQuery = await transaction.get(
                db.collection('users').where('tiktok_username', '==', cleanUsername.toLowerCase()).limit(1)
            );

            if (usersQuery.empty) {
                throw new HttpsError('not-found', 'El usuario de TikTok no está registrado en la base de datos.');
            }

            const userDoc = usersQuery.docs[0];
            const userRef = userDoc.ref;
            const userData = userDoc.data();

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
            // Lógica base: 12 Croins = $5.00 MXN -> Creador gana el 5% = $0.25 MXN
            let earningsToAdd = 0;
            if (deductPurchased > 0) {
                // Solo las croins compradas generan dinero real
                const percentage = 0.05; 
                const baseValue = (deductPurchased / 12) * 5.00; // Si gastó 12 croins compradas, son $5.00 MXN
                earningsToAdd = baseValue * percentage; 
            }

            if (earningsToAdd > 0) {
                transaction.update(streamerRef, {
                    creator_earnings: admin.firestore.FieldValue.increment(earningsToAdd)
                });
            }
        });

        return { success: true };
    } catch (error) {
        logger.error(`Error en processTTSMessage: ${error.message}`);
        throw new HttpsError('internal', error.message); // El backend atrapará esto y no clonará la voz
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
                email: request.auth.token.email,
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
        logger.error(`Error en createConnectAccount: ${error.message}`);
        throw new HttpsError('internal', 'Error al crear la cuenta de Stripe Connect.');
    }
});

exports.requestPayout = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const uid = request.auth.uid;
    const userRef = db.collection('users').doc(uid);

    try {
        let success = false;
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado');
            
            const userData = userDoc.data();
            const earnings = userData.creator_earnings || 0;
            const accountId = userData.stripe_account_id;

            if (earnings <= 0) {
                throw new HttpsError('failed-precondition', 'No hay ganancias para retirar.');
            }
            if (!accountId) {
                throw new HttpsError('failed-precondition', 'No tienes cuenta bancaria vinculada.');
            }
            // NOTA: Para enviar a producción, idealmente verificamos que userData.stripe_charges_enabled == true
            // Esto se actualiza usualmente vía webhook account.updated

            // 1. Ejecutar transferencia a la cuenta conectada (Stripe)
            // Stripe usa centavos, así que multiplicamos por 100
            const amountInCents = Math.floor(earnings * 100);
            
            await stripe.transfers.create({
                amount: amountInCents,
                currency: 'mxn',
                destination: accountId,
                description: `Retiro de Ganancias (Talking Cro.ow) - UID: ${uid}`
            });

            // 2. Descontar las ganancias
            transaction.update(userRef, {
                creator_earnings: 0, // Reiniciamos el balance
                total_withdrawn: admin.firestore.FieldValue.increment(earnings) // Guardamos el histórico
            });
            
            success = true;
        });

        return { success };
    } catch (error) {
        logger.error(`Error en requestPayout: ${error.message}`);
        throw new HttpsError('internal', error.message);
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
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const uid = paymentIntent.metadata.donador_uid;
            const croinsToAdd = parseInt(paymentIntent.metadata.croins, 10);
            const eventId = event.id; // ID único del evento en Stripe

            if (uid && !isNaN(croinsToAdd)) {
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
                    return res.status(500).send(`Database Error: ${dbErr.message}`);
                }
            } else {
                logger.warn("⚠️ Webhook: Pago exitoso pero sin fan_uid o croins en metadatos.");
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
                        return res.status(500).send(`Database Error: ${dbErr.message}`);
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

    const uid = request.auth.uid; // Usuario que gasta (donador)
    const { streamer_uid, feature_type, cost } = request.data;
    
    if (!streamer_uid || !feature_type || !cost || cost <= 0) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros requeridos.');
    }

    const costInt = parseInt(cost, 10);
    const userRef = db.collection('users').doc(uid);
    const streamerRef = db.collection('users').doc(streamer_uid);
    
    try {
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new HttpsError('not-found', 'Usuario no encontrado.');
            }

            const userData = userDoc.data();
            const promotional = userData.promotional_croins || 0;
            const purchased = userData.purchased_croins || 0;
            
            if (promotional + purchased < costInt) {
                throw new HttpsError('failed-precondition', 'Saldo insuficiente.');
            }

            let deductPromo = 0;
            let deductPurchased = 0;

            if (promotional >= costInt) {
                deductPromo = costInt;
            } else {
                deductPromo = promotional;
                deductPurchased = costInt - promotional;
            }

            // Actualizar saldos del usuario
            transaction.update(userRef, {
                promotional_croins: admin.firestore.FieldValue.increment(-deductPromo),
                purchased_croins: admin.firestore.FieldValue.increment(-deductPurchased)
            });

            // Si hay purchased croins gastadas, calculamos el earnings
            if (deductPurchased > 0) {
                // 5% revenue share base
                const CREATOR_REVENUE_SHARE = 0.05;
                const earningsToAdd = deductPurchased * CREATOR_REVENUE_SHARE;

                transaction.set(streamerRef, {
                    creator_earnings: admin.firestore.FieldValue.increment(earningsToAdd)
                }, { merge: true });
            }

            // Registrar la transacción en el ledger
            const ledgerRef = db.collection('ledger').doc();
            transaction.set(ledgerRef, {
                user_uid: uid,
                streamer_uid: streamer_uid,
                feature_type: feature_type,
                cost_total: costInt,
                cost_promo: deductPromo,
                cost_purchased: deductPurchased,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        return { success: true, message: "Feature consumida correctamente." };
    } catch (error) {
        logger.error(`Error en consumeFeature: ${error.message}`);
        throw new HttpsError('internal', error.message);
    }
});

// TC-25: La función migrateLegacyUsers fue eliminada por motivos de seguridad.
