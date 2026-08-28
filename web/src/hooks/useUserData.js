import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Hook personalizado para manejar el perfil y los datos del usuario.
 * ¿POR QUÉ EXISTE?
 * - Extrae el estado global (`useAuth`) y ofrece una función específica (`saveProfile`) para actualizar
 *   la información personal (incluyendo el cambio de username, que tiene reglas estrictas).
 * 
 * ECONOMÍA Y COSTOS ASOCIADOS:
 * - `saveProfile` hace hasta dos escrituras Firestore locales y una llamada a Cloud Function (`updateUsername`)
 *   si el username cambia, generando costos combinados de Firestore (Escritura) + Functions (Invocación).
 * 
 * SEGURIDAD:
 * - Las actualizaciones de perfil a través de `updateUserProfile` son seguras porque 
 *   las Reglas de Firestore bloquean exitosamente cualquier intento de inyección de campos o escalamiento de privilegios.
 * 
 * @returns {{currentUser: object, userData: object, loading: boolean, error: string, saveProfile: Function}}
 */
export function useUserData() {
  const { currentUser, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveProfile = async ({ email, phone, tiktok, username }) => {
    if (!currentUser) throw new Error("No user authenticated");
    setLoading(true);
    setError(null);

    try {
      const tiktokClean = tiktok ? tiktok.trim().toLowerCase() : '';
      
      // Update PII and public data
      await updateUserProfile(currentUser.uid, 
        { tiktok_username: tiktokClean }, 
        { email, phone, tiktok }
      );

      // Handle username update explicitly if changed
      if (username && username.trim() !== (userData?.username || '')) {
        const functions = getFunctions();
        const updateUsernameFn = httpsCallable(functions, 'updateUsername');
        
        try {
          await updateUsernameFn({ newUsername: username });
        } catch (usernameErr) {
          console.error("Error al actualizar nombre de usuario:", usernameErr);
          throw new Error(`Perfil guardado, pero falló el nombre de usuario: ${usernameErr.message}`);
        }
      }

      setLoading(false);
      return true;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    currentUser,
    userData,
    loading: authLoading || loading,
    error,
    saveProfile
  };
}
