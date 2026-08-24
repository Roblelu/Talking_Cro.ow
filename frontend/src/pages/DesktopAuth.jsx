import React, { useEffect, useState } from 'react';
import { auth, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function DesktopAuth({ onNavigate }) {
  const [status, setStatus] = useState("Iniciando...");
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setNeedsLogin(false);
        setStatus("Generando pase de acceso seguro para la app...");
        try {
          const createDesktopToken = httpsCallable(functions, 'createDesktopToken');
          const result = await createDesktopToken();
          const customToken = result.data.token;
          
          setStatus("¡Éxito! Vuelve a la aplicación (puedes cerrar esta ventana).");
          window.location.href = `talkingcrow://auth?token=${customToken}`;
          // Eliminado el window.close()
        } catch (err) {
          console.error(err);
          setStatus("Error al generar el token de acceso. Vuelve a intentarlo.");
        }
      } else {
        setStatus("Para continuar en la aplicación de Escritorio, inicia sesión aquí primero:");
        setNeedsLogin(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        // El onAuthStateChanged se encargará del resto
    } catch (err) {
        console.error(err);
        setStatus("Error al iniciar sesión con Google.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
      <img src="https://talking-crow.web.app/assets/logo.png" alt="Logo" style={{ width: '100px', marginBottom: '20px', animation: 'pulse 2s infinite' }} onError={(e) => e.target.style.display = 'none'} />
      <h2 style={{ color: 'var(--neon-purple)', textShadow: '0 0 10px var(--neon-purple)' }}>Talking Cro.ow Auth</h2>
      <p style={{ marginTop: '20px', fontSize: '1.2rem', color: '#fff', textAlign: 'center', maxWidth: '400px' }}>{status}</p>
      
      {needsLogin && (
          <button 
            onClick={handleGoogleLogin} 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
              padding: '12px', borderRadius: '8px', background: '#fff', color: '#000', 
              border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '300px',
              fontSize: '1.05rem', marginTop: '20px'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continuar con Google
          </button>
      )}

      <div style={{ marginTop: '30px' }}>
         <button className="btn-neon" onClick={() => onNavigate('main')}>Volver al Inicio</button>
      </div>
    </div>
  );
}

