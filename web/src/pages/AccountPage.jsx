import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const PasswordInput = ({ label, value, onChange, show, toggleShow }) => (
  <div style={{ marginBottom: '15px' }}>
    <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      <input 
        type={show ? "text" : "password"} 
        value={value} 
        onChange={onChange}
        placeholder="********" 
        style={{ margin: 0, paddingRight: '40px' }} 
      />
      <button 
        onClick={toggleShow} 
        style={{ 
          position: 'absolute', 
          right: '10px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--neon-purple)', 
          cursor: 'pointer',
          fontSize: '1.2rem',
          outline: 'none'
        }}
        title={show ? "Ocultar" : "Mostrar"}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  </div>
);

const AccountPage = ({ profileImage, setProfileImage }) => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tiktok, setTiktok] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userData) {
      setEmail(userData.email || '');
      setPhone(userData.phone || '');
      setTiktok(userData.tiktok || '');
    }
  }, [userData]);

  const handlePasswordSubmit = () => {
    console.log('Cambiando contraseña...', { currentPassword, newPassword, confirmPassword });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordOpen(false);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    try {
      const privateDocRef = doc(db, "users", currentUser.uid, "private", "contact");
      await setDoc(privateDocRef, { email, phone, tiktok }, { merge: true });
      alert('Perfil actualizado con éxito');
    } catch (err) {
      console.error(err);
      alert('Error al guardar el perfil');
    }
  };

  const isMissingFields = !email || !tiktok;

  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '800px' }}>
        <button 
          className="btn-neon back-btn-responsive" 
          onClick={() => navigate('/dashboard')} 
          style={{ marginBottom: '20px' }}
        >
          &lt; Volver al Panel de Control Principal
        </button>

        <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 className="neon-text-purple" style={{ margin: 0 }}>Cuenta Talking Crow</h2>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '30px', justifyContent: 'center' }}>
              <img 
                src={profileImage || '/avatar_m.jpg'} 
                alt="Perfil" 
                className="avatar-placeholder" 
                style={{ width: '100px', height: '100px', cursor: 'pointer', objectFit: 'cover' }} 
                onClick={() => setIsImageModalOpen(true)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                <h3 style={{ color: 'var(--neon-green)', margin: 0 }}>Bienvenido de vuelta {userData?.username || 'Usuario'}</h3>
                <button className="btn-neon btn-neon-orange" onClick={() => setIsImageModalOpen(true)}>Cambiar Imagen de Perfil</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <label style={{ color: 'var(--text-secondary)', margin: 0 }}>Correo Electrónico</label>
              {!email && <span style={{ color: '#ff003c', fontSize: '0.8rem' }}><span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', borderRadius: '50%' }}>🔴</span> Requerido</span>}
            </div>
            <input type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: '15px', border: !email ? '1px solid #ff003c' : '1px solid rgba(0,255,204,0.3)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <label style={{ color: 'var(--text-secondary)', margin: 0 }}>Teléfono</label>
            </div>
            <input type="tel" placeholder="+52 123 456 7890" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: '15px', border: '1px solid rgba(0,255,204,0.3)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <label style={{ color: 'var(--text-secondary)', margin: 0 }}>Cuenta de TikTok</label>
              {!tiktok && <span style={{ color: '#ff003c', fontSize: '0.8rem' }}><span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', borderRadius: '50%' }}>🔴</span> Requerido</span>}
            </div>
            <input type="text" placeholder="@tu_cuenta" value={tiktok} onChange={(e) => setTiktok(e.target.value)} style={{ marginBottom: '15px', border: !tiktok ? '1px solid #ff003c' : '1px solid rgba(0,255,204,0.3)' }} />
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '30px' }}>
              <button className="btn-neon" onClick={handleSaveProfile}>Guardar Cambios de Perfil</button>
            </div>

            {/* Acordeón de Contraseña */}
            <div style={{ marginTop: '10px' }}>
              <div 
                onClick={() => setIsPasswordOpen(!isPasswordOpen)} 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(157, 0, 255, 0.2)' }}
              >
                <h3 className="neon-text-purple" style={{ margin: 0, fontSize: '1.2rem' }}>
                  Cambiar contraseña
                </h3>
                <span className="neon-text-purple" style={{ fontWeight: 'bold' }}>{isPasswordOpen ? '▲' : '▼'}</span>
              </div>
              
              <div className={`accordion-content ${isPasswordOpen ? 'open' : ''}`}>
                <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(157, 0, 255, 0.2)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                  
                  <PasswordInput 
                    label="Contraseña actual" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    show={showCurrentPassword} 
                    toggleShow={() => setShowCurrentPassword(!showCurrentPassword)} 
                  />
                  
                  <PasswordInput 
                    label="Nueva contraseña" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    show={showNewPassword} 
                    toggleShow={() => setShowNewPassword(!showNewPassword)} 
                  />
                  
                  <PasswordInput 
                    label="Confirmar nueva contraseña" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    show={showConfirmPassword} 
                    toggleShow={() => setShowConfirmPassword(!showConfirmPassword)} 
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                    <button className="btn-neon btn-neon-orange" onClick={handlePasswordSubmit}>Actualizar Contraseña</button>
                  </div>
                </div>
              </div>
            </div>
            
          </div>

          {/* Modal de Imagen de Perfil */}
          {isImageModalOpen && (
            <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsImageModalOpen(false) }}>
              <div className="modal-content" style={{ border: '1px solid var(--neon-purple)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(157, 0, 255, 0.2)' }}>
                <h3 className="modal-title neon-text-purple">Selecciona tu Avatar</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
                  <img 
                    src="/avatar_m.jpg" 
                    alt="Avatar Masculino" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: profileImage === '/avatar_m.jpg' ? '2px solid var(--neon-green)' : '2px solid transparent', boxShadow: profileImage === '/avatar_m.jpg' ? '0 0 10px rgba(57, 255, 20, 0.5)' : 'none' }} 
                    onClick={() => { if(setProfileImage) setProfileImage('/avatar_m.jpg'); setIsImageModalOpen(false); }}
                  />
                  <img 
                    src="/avatar_f.jpg" 
                    alt="Avatar Femenino" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: profileImage === '/avatar_f.jpg' ? '2px solid var(--neon-green)' : '2px solid transparent', boxShadow: profileImage === '/avatar_f.jpg' ? '0 0 10px rgba(57, 255, 20, 0.5)' : 'none' }} 
                    onClick={() => { if(setProfileImage) setProfileImage('/avatar_f.jpg'); setIsImageModalOpen(false); }}
                  />
                </div>
                <div style={{ margin: '20px 0' }}>
                  <button className="btn-neon" onClick={() => fileInputRef.current.click()}>Subir imagen desde PC</button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if(setProfileImage) setProfileImage(reader.result);
                          setIsImageModalOpen(false);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-neon" style={{ borderColor: '#ff003c', color: '#ff003c' }} onClick={() => setIsImageModalOpen(false)}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div></div>
    </div>
  );
};

export default AccountPage;
