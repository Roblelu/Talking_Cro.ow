import { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

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

export default function Register({ onNavigate }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      // 1. Crear el usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Actualizar el displayName con el username
      await updateProfile(user, { displayName: username });

      // 3. Crear su documento en Firestore con su username y 0 Croins iniciales
      // Como estamos unificando Streamers y Fans, lo guardamos en la subcolección fans de "vridel" por ahora
      // Cuando sea multi-streamer, esta ruta cambiará.
      const docRef = doc(db, "streamers", "vridel", "fans", username);
      await setDoc(docRef, {
        Croins: 0,
        isPro: false,
        email: email,
        phone: phone,
        username: username,
        createdAt: new Date()
      });

      // 4. Regresar a la vista principal en lugar de /dashboard
      onNavigate('main');
    } catch (err) {
      console.error(err);
      setError("Error al registrarse. Intenta con otro correo.");
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
              style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
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
              style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Contraseña</label>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: 0 }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: 0, display: 'flex', alignItems: 'center', marginLeft: '10px' }}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Confirmar Contraseña</label>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)' }}>
              <input 
                type={showPassword ? "text" : "password"}
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                style={{ flex: 1, width: '100%', background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: 0 }}
              />
            </div>
          </div>

          <button type="submit" className="btn-neon" style={{ marginTop: '10px', alignSelf: 'center', padding: '10px 40px' }}>Registrarse</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
          ¿Ya tienes cuenta? <span style={{color:'var(--neon-orange)', cursor:'pointer', fontWeight:'bold'}} onClick={() => onNavigate('login')}>Inicia Sesión</span>
        </p>
      </div>
    </div>
  );
}
