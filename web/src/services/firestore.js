import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Servicio para encapsular las llamadas directas a Firestore.
 */

/**
 * Actualiza el perfil público y privado de un usuario.
 * @param {string} uid El ID del usuario.
 * @param {object} publicData Datos para la colección principal (users/{uid}).
 * @param {object} privateData Datos para la subcolección (users/{uid}/private/contact).
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
