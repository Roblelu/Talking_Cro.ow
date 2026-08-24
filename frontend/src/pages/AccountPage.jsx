import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, functions, storage, auth } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import VoiceRecorderModal from '../components/VoiceRecorderModal';

// Iconos SVG simples para mostrar/ocultar contraseña
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

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
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none'
        }}
        title={show ? "Ocultar" : "Mostrar"}
      >
        {show ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </div>
  </div>
);

const AccountPage = ({ onBack }) => {
  const { currentUser, userData } = useAuth();
  
  const [profileImage, setProfileImage] = useState(currentUser?.photoURL || './avatar_user.png');
  const [isUploading, setIsUploading] = useState(false);
  
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [username, setUsername] = useState('');
  const [ecoVoiceId, setEcoVoiceId] = useState('');
  
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userData) {
      setEmail(userData.email || '');
      setPhone(userData.phone || '');
      setTiktok(userData.tiktok || '');
      setUsername(userData.username || '');
      setEcoVoiceId(userData.eco_voice_id || '');
    }
  }, [userData]);

  const handlePasswordSubmit = async () => {
    if (!currentUser?.email || !currentUser.providerData.some((provider) => provider.providerId === 'password')) {
      alert('Esta cuenta no usa contraseña. Gestiona el acceso desde tu proveedor de inicio de sesión.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      alert('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordOpen(false);
      alert('Contraseña actualizada correctamente.');
    } catch (error) {
      console.error('No se pudo actualizar la contraseña:', error.code);
      alert('No se pudo actualizar la contraseña. Verifica tu contraseña actual.');
    }
  };

  const [verificationCode, setVerificationCode] = React.useState('');
  const [isVerifyingTiktok, setIsVerifyingTiktok] = React.useState(false);
  const [isScraping, setIsScraping] = React.useState(false);

  const generateCode = () => {
    return 'TC-' + Math.floor(10000 + Math.random() * 90000);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    if (tiktok && !tiktok.startsWith('@')) {
      alert("Es obligatorio incluir el símbolo @ al inicio del nombre de usuario de TikTok (ej. @UsuarioTikTok).");
      return;
    }
    
    const currentTiktok = userData?.tiktok_username || userData?.tiktok || '';
    if (tiktok.trim().toLowerCase() !== currentTiktok.toLowerCase()) {
      setVerificationCode(generateCode());
      setIsVerifyingTiktok(true);
      return;
    }

    await executeProfileSave();
  };

  const executeProfileSave = async () => {
    try {
      const privateDocRef = doc(db, "users", currentUser.uid, "private", "contact");
      await setDoc(privateDocRef, { email, phone, tiktok }, { merge: true });
      
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { 
        tiktok_username: tiktok.trim().toLowerCase()
      }, { merge: true });
      
      // Actualizar username si cambió
      if (username.trim() !== (userData?.username || '')) {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const updateUsernameFn = httpsCallable(functions, 'updateUsername');
        
        try {
          await updateUsernameFn({ newUsername: username });
          alert('Perfil y nombre de usuario actualizados con éxito');
        } catch (usernameErr) {
          console.error("Error al actualizar nombre de usuario:", usernameErr);
          alert(`Perfil guardado, pero falló el nombre de usuario: ${usernameErr.message}`);
          setUsername(userData?.username || ''); // Revertir
        }
      } else {
        alert('Perfil actualizado con éxito');
      }
      setIsVerifyingTiktok(false);
    } catch (err) {
      console.error(err);
      alert(`Error al guardar el perfil: ${err.message}`);
    }
  };

  const verifyTiktokBio = async () => {
    setIsScraping(true);
    setTimeout(async () => {
      setIsScraping(false);
      alert(`[MODO PRUEBA] Scraping simulado de ${tiktok}... ¡Código ${verificationCode} encontrado! Validación exitosa.`);
      await executeProfileSave();
    }, 2000);
  };

  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '800px' }}>
        <button 
          className="btn-neon back-btn-responsive" 
          onClick={onBack} 
          style={{ marginBottom: '20px' }}
        >
          &lt; Volver al Panel de Control Principal
        </button>

        <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 className="neon-text-purple" style={{ margin: 0 }}>Cuenta Talking Cro.ow</h2>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '30px', justifyContent: 'center' }}>
              <img 
                src={profileImage || './avatar_m.jpg'} 
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
            
        <div style={{ display: 'flex', flexDirection: 'row', gap: '40px', flexWrap: 'wrap' }}>
          {/* Columna Izquierda (Datos Básicos) */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
              <label style={{ color: 'var(--text-secondary)', margin: 0 }}>Nombre de Usuario</label>
              {!username && <span style={{ color: '#ff003c', fontSize: '0.8rem' }}><span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', borderRadius: '50%' }}>🔴</span> Requerido</span>}
            </div>
            <input 
              type="text" 
              placeholder="Tu nombre de usuario" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ marginBottom: username !== (userData?.username || '') ? '5px' : '15px', border: !username ? '1px solid #ff003c' : '1px solid rgba(0,255,204,0.3)' }} 
            />
            {username !== (userData?.username || '') && (
              <small style={{color: 'var(--neon-orange)', fontSize: '0.8rem', display: 'block', marginBottom: '15px'}}>
                El nombre de usuario debe ser único y solo puede cambiarse una vez por semana.
              </small>
            )}

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
          </div>

          {/* Columna Derecha (EcoVoice) */}
          <div style={{ flex: 1, paddingLeft: '20px', borderLeft: '1px solid rgba(157, 0, 255, 0.3)' }}>
            <h3 style={{ color: 'var(--neon-purple)', marginTop: 0 }}>Graba tu Eco Voice</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Sorprende a todos con tu propia voz en el directo de tu streamer afiliado favorito
            </p>

            {ecoVoiceId ? (
              <div style={{ backgroundColor: 'rgba(0, 255, 204, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(0, 255, 204, 0.4)', textAlign: 'center' }}>
                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>🎙️</span>
                <strong style={{ color: 'var(--neon-green)' }}>¡Voz Configurada!</strong>
                <p style={{ fontSize: '0.85rem', color: '#ccc', marginTop: '5px' }}>
                  Tu voz está lista para usarse.
                </p>
                <button className="btn-neon btn-neon-orange" onClick={() => setIsRecorderOpen(true)} style={{ marginTop: '10px', padding: '8px 15px', fontSize: '0.9rem' }}>
                  Regrabar mi voz
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '10px' }}>🎙️</div>
                <button className="btn-neon btn-neon-green" onClick={() => setIsRecorderOpen(true)}>
                  Grabar mi Voz
                </button>
                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>
                </p>
              </div>
            )}
            {/* Subida de Archivo Local */}
            <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px dashed rgba(0, 255, 204, 0.2)', paddingTop: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '10px' }}>O sube un archivo de audio de tu PC:</p>
              
              {isUploadingFile ? (
                <div style={{ padding: '20px' }}>
                  <span className="neon-text-green" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Subiendo Archivo<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span>
                  </span>
                  <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '10px' }}>Por favor no cierres esta ventana</p>
                </div>
              ) : (
                <>
                  <label 
                    style={{ 
                      cursor: 'pointer', 
                      display: 'inline-block', 
                      padding: '8px 20px', 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      border: '1px solid rgba(255, 255, 255, 0.3)', 
                      borderRadius: '8px', 
                      color: 'var(--text-primary)', 
                      fontSize: '0.9rem', 
                      transition: 'all 0.3s' 
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--neon-green)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(57,255,20,0.3)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <input 
                      type="file" 
                      accept=".mp3,.wav,.m4a" 
                      style={{ display: 'none' }} 
                      onChange={async (e) => {
                        if(e.target.files.length > 0) {
                          const file = e.target.files[0];
                          if (file.size > 10 * 1024 * 1024) {
                            alert('El archivo supera el límite de 10 MB.');
                            return;
                          }
                          
                          setIsUploadingFile(true);
                          try {
                            const dataUrl = await new Promise((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
                              reader.onloadend = () => resolve(reader.result);
                              reader.readAsDataURL(file);
                            });
                            
                            const base64data = dataUrl.split(',')[1];
                            
                            let mimeType = file.type;
                            if (!mimeType) {
                              const ext = file.name.split('.').pop().toLowerCase();
                              if (ext === 'mp3') mimeType = 'audio/mpeg';
                              else if (ext === 'wav') mimeType = 'audio/wav';
                              else if (ext === 'm4a') mimeType = 'audio/mp4';
                              else mimeType = 'audio/webm';
                            }
                            
                            const { getFunctions, httpsCallable } = await import('firebase/functions');
                            const { functions } = await import('../firebase');
                            const createEcoVoice = httpsCallable(functions, 'createEcoVoice');
                            
                            const result = await createEcoVoice({
                              base64Audio: base64data,
                              fileName: file.name,
                              mimeType: mimeType
                            });
                            
                            if (result.data.success) {
                              alert('¡Tu EcoVoice se ha creado con éxito desde el archivo!');
                              setEcoVoiceId(result.data.voice_id); 
                            }
                          } catch (error) {
                            alert('Error al subir archivo: ' + error.message);
                          } finally {
                            setIsUploadingFile(false);
                            // Limpiar el input para permitir volver a seleccionar el mismo archivo si hubo error
                            e.target.value = null;
                          }
                        }
                      }} 
                    />
                    📂 Seleccionar Archivo
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                    Formatos aceptados: <span style={{ color: 'var(--neon-green)' }}>.mp3, .wav, .m4a</span>
                  </p>
                </>
              )}
            </div>


          </div>
        </div>

        <VoiceRecorderModal 
          isOpen={isRecorderOpen} 
          onClose={() => setIsRecorderOpen(false)} 
          onSuccess={() => {
            alert("Voz actualizada. Recarga la página si no ves el cambio.");
          }} 
        />
            

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '30px' }}>
              <button className="btn-neon" onClick={handleSaveProfile}>Guardar Cambios de Perfil</button>
            </div>

            <div style={{ marginBottom: '30px', padding: '15px', background: 'rgba(157, 0, 255, 0.1)', border: '1px dashed var(--neon-purple)', borderRadius: '8px', textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'var(--neon-purple)' }}>📢 Instrucciones para tu Audiencia</h4>
              <p style={{ fontSize: '0.85rem', color: '#ddd', margin: '0 0 10px 0' }}>
                Dile a tu chat que usen el comando <strong>Eco</strong> para activar tu voz clonada.
              </p>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                <code style={{ color: 'var(--neon-green)', fontSize: '0.9rem' }}>Eco hola chat de qué va el directo?</code>
              </div>
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
                    src="./avatar_m.jpg" 
                    alt="Avatar Masculino" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: profileImage === './avatar_m.jpg' ? '2px solid var(--neon-green)' : '2px solid transparent', boxShadow: profileImage === './avatar_m.jpg' ? '0 0 10px rgba(57, 255, 20, 0.5)' : 'none' }} 
                    onClick={async () => {
                      if(!currentUser) return;
                      await updateProfile(currentUser, { photoURL: './avatar_m.jpg' });
                      setProfileImage('./avatar_m.jpg'); 
                      setIsImageModalOpen(false); 
                    }}
                  />
                  <img 
                    src="./avatar_f.jpg" 
                    alt="Avatar Femenino" 
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: profileImage === './avatar_f.jpg' ? '2px solid var(--neon-green)' : '2px solid transparent', boxShadow: profileImage === './avatar_f.jpg' ? '0 0 10px rgba(57, 255, 20, 0.5)' : 'none' }} 
                    onClick={async () => { 
                      if(!currentUser) return;
                      await updateProfile(currentUser, { photoURL: './avatar_f.jpg' });
                      setProfileImage('./avatar_f.jpg'); 
                      setIsImageModalOpen(false); 
                    }}
                  />
                </div>
                <div style={{ margin: '20px 0' }}>
                  <button className="btn-neon" onClick={() => fileInputRef.current.click()} disabled={isUploading}>
                    {isUploading ? "Subiendo..." : "Subir imagen desde PC"}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert("La imagen no debe superar los 5MB.");
                          return;
                        }
                        setIsUploading(true);
                        try {
                          const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
                          await uploadBytes(avatarRef, file);
                          const url = await getDownloadURL(avatarRef);
                          await updateProfile(currentUser, { photoURL: url });
                          setProfileImage(url);
                          setIsImageModalOpen(false);
                          alert("Avatar actualizado correctamente");
                        } catch (err) {
                          console.error(err);
                          alert("Error al subir el avatar: " + err.message);
                        } finally {
                          setIsUploading(false);
                        }
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
          {isVerifyingTiktok && (
            <div className="modal-overlay">
              <div className="modal-content" style={{ border: '1px solid var(--neon-green)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(57, 255, 20, 0.2)', width: '500px' }}>
                <h3 className="modal-title neon-text-green" style={{ marginBottom: '15px' }}>Verificación de Autoría</h3>
                <p style={{ color: 'var(--text-primary)', marginBottom: '15px', lineHeight: '1.5' }}>
                  Para evitar el robo de streams, debemos comprobar que <strong>{tiktok}</strong> realmente te pertenece.
                </p>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc' }}>1. Entra a TikTok y edita tu perfil.</p>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#ccc' }}>2. Coloca este código temporal en tu <strong>biografía pública</strong>:</p>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ color: 'var(--neon-green)', margin: '10px 0', letterSpacing: '2px' }}>{verificationCode}</h2>
                    <button 
                      className="btn-neon btn-neon-green" 
                      style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                      onClick={() => { navigator.clipboard.writeText(verificationCode); alert("Copiado al portapapeles"); }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#999' }}>* Podrás borrarlo en cuanto termines este proceso.</p>
                </div>
                
                <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                  <button className="btn-neon" style={{ borderColor: '#ff003c', color: '#ff003c' }} onClick={() => setIsVerifyingTiktok(false)} disabled={isScraping}>Cancelar</button>
                  <button className="btn-neon btn-neon-green" onClick={verifyTiktokBio} disabled={isScraping}>
                    {isScraping ? 'Buscando código...' : '¡Listo! Verificar Biografía'}
                  </button>
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
