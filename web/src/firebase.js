import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { resolveFirebaseAuthDomain } from "./config/authDomain.js";

/**
 * Archivo de configuración central de Firebase.
 * ¿POR QUÉ EXISTE?
 * - Centraliza la inicialización de todos los servicios de Firebase utilizados en la aplicación.
 * - Evita instancias duplicadas al inicializar Firebase una única vez e importar desde aquí.
 *
 * ECONOMÍA Y COSTOS ASOCIADOS:
 * - Firestore (db): Cobros por operaciones de lectura, escritura y eliminación.
 * - Storage (storage): Costos por GB almacenado y ancho de banda de descarga.
 * - Funciones (functions): Costo por invocación, tiempo de cómputo y transferencia de red saliente.
 * - Auth (auth): Verificaciones de SMS/Teléfono si se usaran, y MAU (Monthly Active Users).
 * - App Check: Las validaciones de reCAPTCHA están sujetas a la cuota gratuita de Google Cloud y posterior cobro según volumen.
 * 
 * SEGURIDAD:
 * - La apiKey expuesta en `firebaseConfig` es segura ya que la protección de los datos está 
 *   garantizada exitosamente por las reglas de Firestore (firestore.rules) y Storage.
 */

const runtimeHostname = typeof window !== "undefined" ? window.location.hostname : "";

const firebaseConfig = {
  apiKey: "AIzaSyDMBVLTnF_0nxtrjbdPQWQQrvWL-1WBNRU",
  // MISMO ORIGEN:
  // En Hosting, redirect debe regresar a un helper del mismo dominio para no
  // depender del almacenamiento de terceros bloqueado por Safari/Firefox/Chrome.
  authDomain: resolveFirebaseAuthDomain(runtimeHostname),
  projectId: "talking-crow",
  storageBucket: "talking-crow.firebasestorage.app",
  messagingSenderId: "220088008470",
  appId: "1:220088008470:web:a858a7027fc5eccfac1a37",
  measurementId: "G-7BHRTR907N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

/**
 * TC-07: Inicializar App Check con reCAPTCHA v3 (invisible)
 * ¿POR QUÉ EXISTE?
 * - Protege los endpoints de backend (Firestore, Funciones) contra abusos y tráfico automatizado no autorizado.
 * - Solo se activa en el navegador real.
 */
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
