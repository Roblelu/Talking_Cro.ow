/**
 * @file check_db.js
 * @description Script de una sola línea usado para testear la conectividad básica con Firestore.
 * @purpose Prueba de concepto o one-liner para verificar si un usuario específico (@roblelu) existe rápidamente.
 * @risk [BAJO] Únicamente de lectura y uso interno, asumiendo credenciales predeterminadas (GCP).
 */
const admin = require('firebase-admin'); admin.initializeApp(); const db = admin.firestore(); async function run() { const snapshot = await db.collection('users').where('tiktok_username', '==', '@roblelu').get(); if(snapshot.empty) console.log('Empty'); else snapshot.forEach(doc => console.log(doc.data())); } run();

