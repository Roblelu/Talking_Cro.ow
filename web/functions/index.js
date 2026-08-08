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
exports.createPaymentIntent = onCall(async (request) => {
    // TC-07: Verificación estricta de autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debe iniciar sesión para realizar compras.');
    }
    
    // TC-02: El servidor dicta el UID y el Precio de forma absoluta
    const uid = request.auth.uid;
    const amount = 499; // $4.99 USD por 10 Croins

    try {
        const intent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            metadata: { fan_uid: uid }
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
            const uid = paymentIntent.metadata.fan_uid;
            const eventId = event.id; // ID único del evento en Stripe

            if (uid) {
                try {
                    const streamerId = "vridel";
                    const eventRef = db.collection("processed_events").doc(eventId);
                    const fanRef = db.collection("streamers").doc(streamerId).collection("fans").doc(uid);

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
                        transaction.set(fanRef, {
                            Croins: admin.firestore.FieldValue.increment(10),
                            last_purchase: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    });
                    
                    logger.info(`✅ Webhook: Se añadieron 10 Croins al UID: ${uid}`);
                } catch (dbErr) {
                    logger.error(`❌ Webhook Error actualizando DB: ${dbErr.message}`);
                    // TC-06: Lanzar HTTP 500 para forzar a Stripe a reintentar si Firestore falló
                    return res.status(500).send(`Database Error: ${dbErr.message}`);
                }
            } else {
                logger.warn("⚠️ Webhook: Pago exitoso pero sin fan_uid en metadatos.");
            }
        }

        return res.json({received: true});
    });
});

// Función temporal para migrar los usuarios (TC-19)
exports.migrateLegacyUsers = onRequest(async (req, res) => {
    try {
        const fansRef = db.collection("streamers").doc("vridel").collection("fans");
        const snapshot = await fansRef.get();
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
                    await fansRef.doc(uid).set({
                        Croins: data.Croins || 0,
                        isPro: data.isPro || false,
                        username: data.username || docId,
                        createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp()
                    });

                    // Mover datos privados (PII) a la subcolección
                    await fansRef.doc(uid).collection("private").doc("contact").set({
                        email: data.email,
                        phone: data.phone || ""
                    });

                    // Borrar documento viejo (si el ID era diferente al UID)
                    if (uid !== docId) {
                        await fansRef.doc(docId).delete();
                    } else {
                        // Si era el mismo, solo borrar los campos de PII expuestos
                        await fansRef.doc(docId).update({
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
