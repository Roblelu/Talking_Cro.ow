const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Configuración de las APIs protegidas
// Extraemos las variables de entorno que subiremos a Firebase
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const EULER_KEY = process.env.EULER_KEY;

exports.getEulerKey = onRequest((req, res) => {
    cors(req, res, () => {
        // Validación básica: en el futuro, validar token del streamer
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ error: "Missing username" });
        }

        logger.info(`Entregando Euler Key a: ${username}`);
        
        return res.status(200).json({ 
            key: EULER_KEY 
        });
    });
});

exports.generateTTS = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const { text, username, is_ephemeral, audio_base64 } = req.body;
            const streamerId = "vridel"; // TODO: Hacer dinámico cuando se soporte multi-streamer

            if (!text || !username) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // 1. Verificar base de datos (Firestore)
            const fanRef = db.collection("streamers").doc(streamerId).collection("fans").doc(username);
            const fanDoc = await fanRef.get();
            
            if (!fanDoc.exists) {
                return res.status(403).json({ error: "No registrado", message: "El usuario no existe en la base de datos." });
            }
            
            const fanData = fanDoc.data();
            const croins = fanData.Croins || fanData.croins || 0;
            
            if (croins <= 0) {
                return res.status(403).json({ error: "Sin saldo", message: "El usuario no tiene Croins suficientes." });
            }

            logger.info(`Generando TTS para: ${username}, texto: ${text}. Croins restantes: ${croins}`);

            // 2. Restar 1 Croin (de manera atómica)
            await fanRef.update({
                Croins: admin.firestore.FieldValue.increment(-1)
            });

            let voiceId = "pNInz6obpgDQGcFmaJgB"; // Voz default
            let clonedVoiceId = null;

            // 1. Clonación Efímera
            if (is_ephemeral && audio_base64) {
                logger.info("Clonando voz efímera...");
                const form = new FormData();
                form.append("name", "DonadorTemporal");
                form.append("description", "Voz clonada efímera desde Firebase");
                
                // Convertimos el base64 a Buffer
                const audioBuffer = Buffer.from(audio_base64, "base64");
                form.append("files", audioBuffer, {
                    filename: "temp.wav",
                    contentType: "audio/wav",
                });

                const cloneRes = await axios.post("https://api.elevenlabs.io/v1/voices/add", form, {
                    headers: {
                        "xi-api-key": ELEVENLABS_API_KEY,
                        ...form.getHeaders(),
                    },
                });

                if (cloneRes.data && cloneRes.data.voice_id) {
                    clonedVoiceId = cloneRes.data.voice_id;
                    voiceId = clonedVoiceId;
                    logger.info(`Voz clonada exitosamente: ${voiceId}`);
                }
            }

            // 2. Generar el Audio TTS
            logger.info(`Solicitando síntesis de audio a ElevenLabs (Voice ID: ${voiceId})...`);
            const ttsRes = await axios.post(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    text: text,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                },
                {
                    headers: {
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "xi-api-key": ELEVENLABS_API_KEY,
                    },
                    responseType: "arraybuffer" // Recibir como binario
                }
            );

            // 3. Borrar el clon efímero
            if (clonedVoiceId) {
                logger.info(`Borrando voz efímera: ${clonedVoiceId}`);
                try {
                    await axios.delete(`https://api.elevenlabs.io/v1/voices/${clonedVoiceId}`, {
                        headers: { "xi-api-key": ELEVENLABS_API_KEY }
                    });
                } catch (delError) {
                    logger.error(`Error borrando voz: ${delError.message}`);
                }
            }

            // Devolver el archivo mp3 codificado en base64 al backend local
            const mp3Base64 = Buffer.from(ttsRes.data).toString("base64");
            
            return res.status(200).json({
                status: "ok",
                audio_base64: mp3Base64
            });

        } catch (error) {
            logger.error(`Error en generateTTS: ${error.message}`);
            if (error.response) {
                logger.error(error.response.data);
            }
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });
});
