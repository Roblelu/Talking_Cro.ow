import { auth } from "../firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

/**
 * Cierra la sesión del usuario actual en Firebase Auth.
 * ¿POR QUÉ EXISTE?
 * - Centraliza y encapsula las llamadas directas al SDK de Firebase para el cierre de sesión,
 *   permitiendo que cualquier componente ejecute el logout de forma limpia.
 * @returns {Promise<boolean>} True si cerró sesión correctamente.
 */
export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};
