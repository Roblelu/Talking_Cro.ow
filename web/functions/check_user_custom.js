const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const serviceAccount = require("./firebase-service-account.json"); // if it exists
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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

