const admin = require("firebase-admin");

// Initialize sin parámetros intenta usar GOOGLE_APPLICATION_CREDENTIALS o entorno GCE
admin.initializeApp({
  projectId: "talking-crow"
});
const db = admin.firestore();

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

