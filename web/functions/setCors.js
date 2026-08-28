const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  keyFilename: 'C:/Users/cnkrx/OneDrive/Escritorio/Hevel World/Patiidu/Talking Crow/backend/firebase-service-account.json'
});

const bucketName = 'talking-crow.firebasestorage.app';

/**
 * @file setCors.js
 * @description Script independiente para configurar las reglas de CORS en el bucket principal de Firebase Storage.
 * @purpose Permite a las aplicaciones cliente web acceder y modificar archivos en el Storage directamente sin pasar por el backend.
 * @risk [ALTO] Utiliza `origin: ['*']` para métodos destructivos como PUT, POST y DELETE. Esto permite que cualquier dominio inicie estas peticiones; toda la seguridad recae únicamente en `storage.rules`.
 */

/**
 * Aplica la configuración de CORS al bucket definido.
 * @async
 * @function configureCors
 * @returns {Promise<void>}
 */
async function configureCors() {
  await storage.bucket(bucketName).setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
      origin: ['*'],
      responseHeader: ['Content-Type', 'Authorization', 'Content-Length', 'User-Agent', 'x-goog-resumable'],
    },
  ]);
  console.log(`CORS configuration updated successfully for bucket ${bucketName}`);
}

configureCors().catch(console.error);
