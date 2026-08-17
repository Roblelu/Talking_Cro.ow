import { useState } from "react";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await signOut(auth);
        setError("Esta cuenta aún no está registrada. Usa Registro para aceptar el aviso de privacidad y crear tu perfil.");
        return;
      }
      
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("desktop") === "true") {
        navigate("/auth-desktop");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Error Google: " + (err.message || "Desconocido"));
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Iniciar Sesión</h2>
        {error && <div style={{ color: '#ff003c', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Ingresa de forma rápida y segura usando tu cuenta de Google.
        </p>

        <button 
          onClick={handleGoogleLogin} 
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
            padding: '12px', borderRadius: '8px', background: '#fff', color: '#000', 
            border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%',
            fontSize: '1.05rem', marginTop: '10px'
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

        <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)' }}>
          ¿No tienes cuenta? <span style={{color:'var(--neon-orange)', cursor:'pointer', fontWeight:'bold'}} onClick={() => navigate('/register')}>Regístrate</span>
        </p>
      </div>
    </div>
  );
}
