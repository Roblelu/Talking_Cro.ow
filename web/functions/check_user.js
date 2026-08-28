const admin = require("firebase-admin");

// Initialize sin parámetros intenta usar GOOGLE_APPLICATION_CREDENTIALS o entorno GCE
admin.initializeApp({
  projectId: "talking-crow"
});
const db = admin.firestore();

/**
 * @file check_user.js
 * @description Script de utilidad en Node para consultar información de un usuario específico (@roblelu) en Firestore.
 * @purpose Depuración manual o revisión rápida de datos de usuario en la base de datos de producción/dev.
 * @risk [BAJO] No expone endpoints. Hardcodea el nombre de usuario de prueba y asume credenciales de entorno válidas.
 */

/**
 * Consulta y muestra en consola los datos del usuario con el tiktok_username `@roblelu`.
 * @async
 * @function checkUser
 * @returns {Promise<void>}
 */
async function checkUser() {
    const username = "@roblelu";
    const snapshot = await db.collection('users').where('tiktok_username', '==', username.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
        console.log(`Usuario ${username} no encontrado en la base de datos.`);
    } else {
        const data = snapshot.docs[0].data();
        console.log("Usuario encontrado:");
        console.log(data);
    }
    process.exit(0);
}

checkUser().catch(console.error);

