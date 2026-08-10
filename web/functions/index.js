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

// Función temporal para migrar los usuarios (TC-19)
exports.migrateLegacyUsers = onRequest(async (req, res) => {
    try {
        const donadoresRef = db.collection("streamers").doc("vridel").collection("donadores");
        const snapshot = await donadoresRef.get();
        let migrated = 0;
        let skipped = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const docId = doc.id;

            // Si tiene email directamente en la raíz, es una cuenta vieja
            if (data.email) {
                try {
                    // Buscar UID real en Firebase Auth
                    const userRecord = await admin.auth().getUserByEmail(data.email);
                    const uid = userRecord.uid;

                    // Clonar datos básicos al nuevo documento con ID = uid
                    await donadoresRef.doc(uid).set({
                        Croins: data.Croins || 0,
                        isPro: data.isPro || false,
                        username: data.username || docId,
                        createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Mover datos privados (PII) a la subcolección
                    await donadoresRef.doc(uid).collection("private").doc("contact").set({
                        email: data.email,
                        phone: data.phone || ""
                    });

                    // Borrar documento viejo (si el ID era diferente al UID)
                    if (uid !== docId) {
                        await donadoresRef.doc(docId).delete();
                    } else {
                        // Si era el mismo, solo borrar los campos de PII expuestos
                        await donadoresRef.doc(docId).update({
                            email: admin.firestore.FieldValue.delete(),
                            phone: admin.firestore.FieldValue.delete()
                        });
                    }
                    migrated++;
                } catch (e) {
                    logger.error(`Error migrando ${docId}:`, e);
                }
            } else {
                skipped++;
            }
        }
        res.json({ success: true, migrated, skipped });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
