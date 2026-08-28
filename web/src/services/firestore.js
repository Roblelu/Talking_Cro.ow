import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Servicio para encapsular las llamadas directas a Firestore.
 */

/**
 * Actualiza el perfil público y privado de un usuario.
 * ¿POR QUÉ EXISTE?
 * - Unifica la lógica de escritura en dos colecciones distintas (pública y privada).
 * - Mantiene el principio de separación de datos sensibles (PII).
 * 
 * ECONOMÍA Y COSTOS ASOCIADOS:
 * - Realiza hasta 2 operaciones de escritura (`setDoc`) por cada actualización. 
 *   Escalar esto con actualizaciones muy frecuentes podría incrementar los costos de Firestore (Escrituras).
 * 
 * SEGURIDAD:
 * - La inyección de campos (ej. `role: 'admin'`) mediante `merge: true` está protegida y bloqueada 
 *   de manera exitosa gracias a las políticas estrictas de las Reglas de Seguridad de Firestore.
 * 
 * @param {string} uid El ID del usuario.
 * @param {object} publicData Datos para la colección principal (users/{uid}).
 * @param {object} privateData Datos para la subcolección (users/{uid}/private/contact).
 * @returns {Promise<boolean>} True si la actualización fue exitosa.
 */
export const updateUserProfile = async (uid, publicData, privateData) => {
  if (!uid) throw new Error("UID is required to update profile.");

  try {
    // 1. Guardar datos privados (PII)
    if (privateData && Object.keys(privateData).length > 0) {
      const privateDocRef = doc(db, "users", uid, "private", "contact");
      await setDoc(privateDocRef, privateData, { merge: true });
    }

    // 2. Guardar datos públicos
    if (publicData && Object.keys(publicData).length > 0) {
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, publicData, { merge: true });
    }

    return true;
  } catch (error) {
    console.error("Error en updateUserProfile:", error);
    throw error;
  }
};
