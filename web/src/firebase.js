import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDMBVLTnF_0nxtrjbdPQWQQrvWL-1WBNRU",
  authDomain: "talking-crow.firebaseapp.com",
  projectId: "talking-crow",
  storageBucket: "talking-crow.firebasestorage.app",
  messagingSenderId: "220088008470",
  appId: "1:220088008470:web:a858a7027fc5eccfac1a37",
  measurementId: "G-7BHRTR907N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// TC-07: Inicializar App Check con reCAPTCHA v3 (invisible)
// Solo se activa en el navegador real, no en entornos de prueba
if (typeof window !== 'undefined') {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LdNyYotAAAAAOU57YXg6dJ5pJmtF2Jb_EBCojMI'),
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    console.warn('[App Check] No se pudo inicializar:', e.message);
  }
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { db, storage, auth, functions };
