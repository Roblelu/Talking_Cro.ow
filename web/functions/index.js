const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors")({ origin: true });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

admin.initializeApp();
const db = admin.firestore();

// Configuración de las APIs protegidas
// Extraemos las variables de entorno que subiremos a Firebase
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const EULER_KEY = process.env.EULER_KEY;

// ---------------------------------------------------------
// Pasarela de Pagos Segura (Stripe)
// ---------------------------------------------------------
exports.createPaymentIntent = onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const { uid, amount } = req.body;
            if (!uid || !amount) {
                return res.status(400).json({ error: "Faltan datos de usuario o monto" });
            }

            // Crea un PaymentIntent (amount está en centavos)
            const intent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                metadata: { fan_uid: uid }
            });

            return res.status(200).json({ client_secret: intent.client_secret });
        } catch (error) {
            logger.error(`Error en createPaymentIntent: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    });
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

            if (uid) {
                try {
                    const streamerId = "vridel";
                    const fanRef = db.collection("streamers").doc(streamerId).collection("fans").doc(uid);
                    await fanRef.set({
                        Croins: admin.firestore.FieldValue.increment(10),
                        last_purchase: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    
                    logger.info(`✅ Webhook: Se añadieron 10 Croins al UID: ${uid}`);
                } catch (dbErr) {
                    logger.error(`❌ Webhook Error actualizando DB: ${dbErr.message}`);
                }
            } else {
                logger.warn("⚠️ Webhook: Pago exitoso pero sin fan_uid en metadatos.");
            }
        }

        return res.json({received: true});
    });
});

