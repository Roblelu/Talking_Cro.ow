import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--neon-green)' }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      // TC-11: Comprobar que el nombre de usuario no esté ocupado (usando la colección usernames)
      const usernameRef = doc(db, "usernames", username);
      const usernameSnap = await getDoc(usernameRef);
      
      if (usernameSnap.exists()) {
         return setError("El nombre de usuario ya está ocupado. Elige otro.");
      }

      // 1. Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Actualizar el displayName con el username
      await updateProfile(user, { displayName: username });

      // 3. Crear su documento público en Firestore usando su UID y saldos iniciales
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, {
        purchased_croins: 0,
        promotional_croins: 0,
        creator_credits: 0,
        creator_earnings: 0,
        isPro: false,
        username: username,
        createdAt: new Date()
      });

      // 4. Guardar datos sensibles (PII) en una subcolección privada aislada
      const privateDocRef = doc(db, "users", user.uid, "private", "contact");
      await setDoc(privateDocRef, {
        email: email,
        phone: phone
      });

      // 5. Reservar el nombre de usuario en la colección usernames
      await setDoc(usernameRef, { uid: user.uid });

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error al registrarse. Intenta con otro correo o revisa tu conexión.");
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
          const baseName = user.displayName || user.email.split('@')[0];
          let finalUsername = baseName.replace(/\s+/g, '_').toLowerCase();
          
          const usernameRef = doc(db, "usernames", finalUsername);
          const usernameSnap = await getDoc(usernameRef);
          
          let targetUsernameRef = usernameRef;
          if (usernameSnap.exists()) {
            finalUsername = `${finalUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            targetUsernameRef = doc(db, "usernames", finalUsername);
          }
          
          await setDoc(targetUsernameRef, { uid: user.uid });
          const newData = { purchased_croins: 0, promotional_croins: 0, creator_credits: 0, creator_earnings: 0, isPro: false, username: finalUsername, createdAt: new Date() };
          await setDoc(docRef, newData);
          const privateDocRef = doc(db, "users", user.uid, "private", "contact");
          const privateData = { email: user.email, phone: user.phoneNumber || "" };
          await setDoc(privateDocRef, privateData);
      }
      
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error Google: " + (err.message || "Desconocido"));
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Crear Cuenta</h2>
        {error && <div style={{ color: '#ff003c', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Nombre de Usuario</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              placeholder="Ej. User_Name"
              style={{ margin: 0, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ margin: 0, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Teléfono</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              required 
              placeholder="Ej. +52 123 456 7890"
              style={{ margin: 0, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Contraseña</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ margin: 0, width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff', paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Confirmar Contraseña</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input 
                type={showPassword ? "text" : "password"}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                style={{ margin: 0, width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '5px' }}>
            <input type="checkbox" required id="privacy_consent" style={{ marginTop: '3px' }} />
            <label htmlFor="privacy_consent" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'left', lineHeight: '1.4' }}>
              Acepto que mis mensajes y nombre de usuario pueden ser procesados temporalmente por modelos de Inteligencia Artificial (TTS) para la generación de audio.
            </label>
          </div>

          <button type="submit" className="btn-neon" style={{ marginTop: '10px', alignSelf: 'center', padding: '10px 40px' }}>Registrarse</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ margin: '0 10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>O</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <button 
          onClick={handleGoogleRegister} 
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
            padding: '10px', borderRadius: '8px', background: '#fff', color: '#000', 
            border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%' 
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continuar con Google
        </button>

        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
          ¿Ya tienes cuenta? <span style={{color:'var(--neon-orange)', cursor:'pointer', fontWeight:'bold'}} onClick={() => navigate('/login')}>Inicia Sesión</span>
        </p>
      </div>
    </div>
  );
}
