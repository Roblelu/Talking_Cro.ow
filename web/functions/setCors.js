const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  keyFilename: 'C:/Users/cnkrx/OneDrive/Escritorio/Hevel World/Patiidu/Talking Crow/backend/firebase-service-account.json'
});

const bucketName = 'talking-crow.firebasestorage.app';

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
