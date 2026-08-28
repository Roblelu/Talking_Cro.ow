const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const serviceAccount = require("./firebase-service-account.json"); // if it exists
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * @file check_user_custom.js
 * @description Script en Node.js que autentica explícitamente mediante service account (clave local) y busca un usuario.
 * @purpose Permite verificar múltiples variaciones del nombre de usuario de TikTok `@roblelu` para resolver problemas de asociación.
 * @risk [MEDIO] Depende del archivo de credenciales de Firebase en la misma carpeta (`firebase-service-account.json`). Si este archivo se llega a commitear por accidente, expone toda la base de datos con permisos de administrador.
 */

/**
 * Consulta en la base de datos usuarios coincidentes con varias iteraciones del handle de roblelu.
 * @async
 * @function checkUser
 * @returns {Promise<void>}
 */
async function checkUser() {
  try {
    const snapshot = await db.collection('users').where('tiktok_username', 'in', ['@roblelu', 'roblelu', '@roble_lu', 'roble_lu']).get();
    if (snapshot.empty) {
      console.log("No user found with that tiktok username");
      process.exit(0);
      return;
    }
    snapshot.forEach(doc => {
      console.log(doc.id, "=>", doc.data());
    });
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
checkUser();

