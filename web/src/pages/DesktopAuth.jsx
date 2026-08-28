import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { logAuthFlowError } from '../services/googleRegistration';

export default function DesktopAuth() {
  const [status, setStatus] = useState("Iniciando...");
  const [manualToken, setManualToken] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          setStatus("Comprobando tu perfil...");
          const profileSnapshot = await getDoc(doc(db, "users", user.uid));

          // No se entrega un custom token a Electron hasta que el perfil exista.
          // Así la app nunca entra autenticada con balances/username ausentes.
          if (!profileSnapshot.exists()) {
            navigate('/register?resume=true&desktop=true', { replace: true });
            return;
          }

          setStatus("Generando pase de acceso seguro para la app...");
          const idToken = await user.getIdToken();
          const response = await fetch('/api/getDesktopToken', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          const customToken = data.token;
          setManualToken(customToken);
          
          setStatus("¡Éxito! Vuelve a la aplicación (puedes cerrar esta ventana).");
          
          const a = document.createElement('a');
          a.href = `talkingcrow://auth?token=${customToken}`;
          a.click();
          
          // Eliminado el window.close() para dar tiempo al usuario de hacer clic en "Permitir"
        } catch (err) {
          logAuthFlowError("desktop_handoff", err);
          setStatus("Error al generar el token de acceso. Vuelve a intentarlo.");
        }
      } else {
        setStatus("Redirigiendo a inicio de sesión...");
        navigate('/login?desktop=true');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', flexDirection: 'column' }}>
      <img src="/assets/logo.png" alt="Logo" style={{ width: '100px', marginBottom: '20px', animation: 'pulse 2s infinite' }} onError={(e) => e.target.style.display = 'none'} />
      <h2 style={{ color: 'var(--neon-purple)', textShadow: '0 0 10px var(--neon-purple)' }}>Talking Cro.ow Auth</h2>
      <p style={{ marginTop: '20px', fontSize: '1.2rem', color: '#fff', textAlign: 'center', maxWidth: '400px' }}>{status}</p>

      <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
         {status.includes("¡Éxito!") && manualToken && (
           <button 
             className="btn-neon" 
             style={{ backgroundColor: '#28a745', borderColor: '#28a745' }}
             onClick={() => window.location.href = `talkingcrow://auth?token=${manualToken}`}
           >
             Abrir Aplicación Manualmente
           </button>
         )}
         <button className="btn-neon" onClick={() => navigate('/')}>Ir a Inicio</button>
      </div>
    </div>
  );
}

