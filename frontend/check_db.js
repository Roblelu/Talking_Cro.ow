const admin = require('firebase-admin');
const serviceAccount = require('../website/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function check() {
  const users = await db.collection('users').where('email', '==', 'spo.okycro.ow@gmail.com').get();
  if (users.empty) {
    console.log('No user found');
    return;
  }
  users.forEach(doc => {
    console.log('User:', doc.id, doc.data());
  });
}
check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
