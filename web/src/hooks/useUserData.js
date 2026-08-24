import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

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
