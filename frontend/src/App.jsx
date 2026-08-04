import React, { useState } from 'react';
import './index.css';
import logoImg from './assets/logo.png';
import titleImg from './assets/title.png';

import AccountPage from './pages/AccountPage';
import SubscriptionPage from './pages/SubscriptionPage';
import PortConfigPage from './pages/PortConfigPage';
import SupportPage from './pages/SupportPage';
import TermsPage from './pages/TermsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

// Modal Component
const Modal = ({ isOpen, title, message, type, onConfirm, onCancel, confirmText = 'Aceptar' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${type === 'alert' ? 'alert-modal' : ''}`}>
        <h3 className={`modal-title ${type === 'alert' ? 'neon-text-orange' : 'neon-text-purple'}`}>{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          {type === 'confirm' && (
            <button className="btn-neon btn-neon-red" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button className="btn-neon btn-neon-orange" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Scripts de Ejemplo para la App
const exampleScripts = [
  {
    name: "Jumpscare (Pantalla Completa)",
    icon: "👻",
    code: `import os\\nimport time\\n\\n# ======= CONFIGURACION =======\\nIMAGEN_PATH = "C:\\\\\\\\ruta\\\\\\\\a\\\\\\\\tu\\\\\\\\imagen_terror.png"\\nAUDIO_PATH = "C:\\\\\\\\ruta\\\\\\\\a\\\\\\\\tu\\\\\\\\grito.wav"\\nTIEMPO_EN_PANTALLA = 1.5 # Segundos\\n# =============================\\n\\ntry:\\n    import pygame\\n    pygame.init()\\n    pygame.mixer.init()\\n    \\n    pygame.mixer.Sound(AUDIO_PATH).play()\\n    \\n    screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)\\n    img = pygame.image.load(IMAGEN_PATH)\\n    img = pygame.transform.scale(img, screen.get_size())\\n    screen.blit(img, (0, 0))\\n    pygame.display.flip()\\n    \\n    time.sleep(TIEMPO_EN_PANTALLA)\\n    pygame.quit()\\nexcept Exception as e:\\n    print("Error:", e)\\n`
  },
  {
    name: "Rocola Shift (Siguiente Canción)",
    icon: "🎵",
    code: `import os\\n\\n# ======= CONFIGURACION =======\\n# Este script usa comandos de teclado multimedia para pasar a la siguiente cancion.\\n# Spotify o tu reproductor deben estar abiertos.\\n# =============================\\n\\ntry:\\n    import pyautogui\\n    pyautogui.press('nexttrack')\\n    print("Cancion cambiada.")\\nexcept ImportError:\\n    print("Falta instalar pyautogui: pip install pyautogui")\\n`
  },
  {
    name: "Pistolitas (Efecto de Sonido)",
    icon: "🔫",
    code: `import os\\n\\n# ======= CONFIGURACION =======\\nAUDIO_PATH = "C:\\\\\\\\ruta\\\\\\\\a\\\\\\\\tu\\\\\\\\sonido_pew_pew.wav"\\n# =============================\\n\\ntry:\\n    import pygame\\n    pygame.mixer.init()\\n    sound = pygame.mixer.Sound(AUDIO_PATH)\\n    sound.set_volume(1.0)\\n    sound.play()\\n    while pygame.mixer.get_busy():\\n        pygame.time.Clock().tick(10)\\nexcept Exception as e:\\n    print("Error:", e)\\n`
  }
];

function App() {
  const [activeView, setActiveView] = useState('main');
  const [profileImage, setProfileImage] = useState('/avatar_m.jpg');
  
  const { currentUser, userProfile } = useAuth();
  const [gifts, setGifts] = useState([]);
  
  React.useEffect(() => {
    const API_BASE = 'http://127.0.0.1:8763';
    
    let isMounted = true;
    const checkBackend = () => {
      fetch(API_BASE + '/api/settings')
        .then(res => {
          if (res.ok) {
            if (isMounted) setIsBackendReady(true);
            res.json().then(data => {
              if(data && data.tiktok_username && isMounted) setTiktokUsername(data.tiktok_username);
            });
            
            fetch(API_BASE + '/api/gifts')
              .then(r => r.json())
              .then(d => { if (isMounted) setGifts(d); })
              .catch(err => console.error(err));
              
            fetch(API_BASE + '/api/tts/state')
              .then(r => r.json())
              .then(d => { if (isMounted) setIsTtsLiveEnabled(d.enabled); })
              .catch(err => console.error(err));
          }
        })
        .catch(err => {
          if (isMounted) {
            setIsBackendReady(false);
            setTimeout(checkBackend, 2000);
          }
        });
    };
    
    checkBackend();
    return () => { isMounted = false; };
  }, []);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon('http://localhost:8763/api/shutdown');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, []);

  const toggleTts = async () => {
    try {
      const newState = !isTtsLiveEnabled;
      const API_BASE = 'http://127.0.0.1:8763';
      const res = await fetch(API_BASE + '/api/tts/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState })
      });
      const data = await res.json();
      setIsTtsLiveEnabled(data.enabled);
    } catch (e) {
      console.error("Error toggling TTS:", e);
    }
  };

  const handleShutdown = async () => {
    try {
      await fetch('http://localhost:8763/api/shutdown', { method: 'POST' });
    } catch (e) {
      console.log("Servidor cerrado.");
    }
    window.close();
    document.body.innerHTML = "<div style='display:flex;height:100vh;background:#000;color:#ff003c;align-items:center;justify-content:center;font-family:Orbitron;font-size:2rem;text-shadow:0 0 10px #ff003c;'>SISTEMA APAGADO. YA PUEDES CERRAR LA VENTANA.</div>";
  };

  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftValue, setNewGiftValue] = useState('');

  // Audio Context para el Pitido del Censurador
  const audioCtxRef = React.useRef(null);
  const oscillatorRef = React.useRef(null);

  const startCensorBleep = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine'; // Tono de censura limpio
    osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1000 Hz es el estándar de TV
    gain.gain.setValueAtTime(0.3, ctx.currentTime); // Volumen al 30%

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    oscillatorRef.current = osc;
  };

  const stopCensorBleep = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop();
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }
  };
  const [newGiftScript, setNewGiftScript] = useState('');
  const [isTiktokConnected, setIsTiktokConnected] = useState(false);
  const [isBackendReady, setIsBackendReady] = useState(false);
  
  const [tiktokUsername, setTiktokUsername] = useState(localStorage.getItem('lastTiktokUsername') || '');
  const [hostAvatar, setHostAvatar] = useState(null);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [isTopGiftsOpen, setIsTopGiftsOpen] = useState(false);
  const [isExampleScriptsOpen, setIsExampleScriptsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDmsOpen, setIsDmsOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [isTtsLiveEnabled, setIsTtsLiveEnabled] = useState(false);
  const [audioQueue, setAudioQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [donators, setDonators] = useState([]);
  
  const [sounds, setSounds] = useState([
    { icon: '💥', name: 'Boom' }, { icon: '👏', name: 'Aplausos' }, { icon: '🥁', name: 'Redoble' },
    { icon: '🦗', name: 'Grillos' }, { icon: '🎺', name: 'Trompeta' }, { icon: '👻', name: 'Grito' },
    { icon: '🪄', name: 'Magia' }
  ]);
  const [stickers, setStickers] = useState([
    { icon: '✨', name: 'Brillo' }, { icon: '🤡', name: 'Payaso' }, { icon: '💀', name: 'Calavera' },
    { icon: '🔥', name: 'Fuego' }, { icon: '💯', name: 'Cien' }, { icon: '💖', name: 'Corazón' },
    { icon: '🥶', name: 'Frío' }
  ]);

  const handleDeleteSound = (index, e) => {
    e.preventDefault();
    if (window.confirm('¿Deseas eliminar este Efecto de Sonido?')) {
      setSounds(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDeleteSticker = (index, e) => {
    e.preventDefault();
    if (window.confirm('¿Deseas eliminar este Sticker?')) {
      setStickers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const [activeModal, setActiveModal] = useState(null);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemFile, setNewItemFile] = useState(null);
  const [dmUrl, setDmUrl] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const unreadCount = donators.filter(d => d.isNew).length;
  
  const dropdownRef = React.useRef(null);
  const webviewRef = React.useRef(null);
  
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    const API_BASE = 'http://127.0.0.1:8763';
    // Conexión SSE
    const sse = new EventSource(API_BASE + '/api/live_events');
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'room_info') {
            setHostAvatar(data.message);
        } else if (data.type === 'priority_audio') {
            const newAudio = { ...data, timestamp: new Date(), id: Date.now().toString() };
            setAudioQueue(prev => [...prev, newAudio]);
        } else {
            const newEvent = { ...data, timestamp: new Date() };
            
            // Si el evento es un chat o un regalo, guardamos al usuario para los DMs
            if (data.type === 'chat' || data.type === 'gift') {
              setDonators(prev => {
                 if (!prev.find(d => d.username === data.username)) {
                    // Lo añadimos al inicio de la lista
                    return [{ id: Date.now().toString() + Math.random(), username: data.username, isNew: true }, ...prev];
                 }
                 return prev;
              });
            }

            // Añadir al FINAL para que con flexDirection: column los nuevos salgan abajo
            setLiveEvents(prev => {
                const updated = [...prev, newEvent];
                return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
            });
        }
      } catch(err) {
        console.error("SSE error", err);
      }
    };

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      sse.close();
    };
  }, []);

  const topTikTokGifts = [
    { key: 'Rose', name: 'Rosa', img: 'rose.png' },
    { key: 'TikTok', name: 'TikTok', img: 'tiktok.png' },
    { key: 'Finger Heart', name: 'Corazón con los dedos', img: 'finger_heart.png' },
    { key: 'Doughnut', name: 'Dona', img: 'doughnut.png' },
    { key: 'Confetti', name: 'Confeti', img: 'confetti.png' },
    { key: 'Corgi', name: 'Corgi', img: 'corgi.png' },
    { key: 'Galaxy', name: 'Galaxia', img: 'galaxy.png' }
  ];

  // Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null, onCancel: null, confirmText: 'Aceptar' });

  const showAlert = (title, message, confirmText = 'Aceptar', customOnConfirm = null) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'alert',
      confirmText,
      onConfirm: () => {
        if (customOnConfirm) customOnConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: null
    });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      confirmText: 'Aceptar',
      onConfirm: () => {
        onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleAddGift = async () => {
    if (!newGiftName || !newGiftScript) {
      showAlert("Error", "Por favor, ponle nombre y un script al regalo.");
      return;
    }
    const payload = {
      name: newGiftName,
      trigger_value: newGiftValue || '0',
      script: newGiftScript
    };
    try {
      const API_BASE = 'http://127.0.0.1:8763';
      const res = await fetch(API_BASE + '/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setGifts([...gifts, data]);
      setNewGiftName('');
      setNewGiftValue('');
      setNewGiftScript('');
    } catch(err) {
      console.error(err);
      showAlert("Error", "No se pudo guardar en la base de datos.");
    }
  };

  const handleDeleteGift = (id, name) => {
    showConfirm(
      "Eliminar Regalo",
      `¿Estás seguro de que deseas eliminar el regalo "${name}"?`,
      async () => {
        try {
          const API_BASE = 'http://127.0.0.1:8763';
          await fetch(API_BASE + `/api/gifts/${id}`, { method: 'DELETE' });
          setGifts(gifts.filter(g => g.id !== id));
        } catch(err) {
          console.error(err);
        }
      }
    );
  };
  
  const handleConnect = async () => {
    if (!tiktokUsername.trim()) return;
    setIsTiktokConnected(true);
    setHostAvatar(null);
    localStorage.setItem('lastTiktokUsername', tiktokUsername);
    
    const API_BASE = 'http://127.0.0.1:8763';
    const cleanUsername = tiktokUsername.replace('@', '').trim();
    
    fetch(API_BASE + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktok_username: cleanUsername, base_audio_path: '' })
    }).catch(e => console.log(e));
    
    try {
      const res = await fetch(API_BASE + '/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername })
      });
      const data = await res.json();
      if(data.status !== "conectando") {
         setIsTiktokConnected(false);
         showAlert("Error", "No se pudo conectar: " + data.message);
      }
    } catch(e) {
      setIsTiktokConnected(false);
      showAlert("Error", "Fallo al comunicar con el backend.");
    }
  };

  const handleDisconnect = () => {
    showConfirm(
      "Aviso",
      "¿Quieres desconectar el chat en vivo del Streaming?",
      async () => {
        const API_BASE = 'http://127.0.0.1:8763';
        try {
            await fetch(API_BASE + '/api/tiktok/disconnect', { method: 'POST' });
        } catch(e) {}
        setIsTiktokConnected(false);
        setHostAvatar(null);
        setLiveEvents([]);
        setDonators([]);
      }
    );
  };

  const handlePlayAudio = (id) => {
    const audioData = audioQueue.find(a => a.id === id);
    if (audioData && audioData.audio_url) {
       console.log("Reproduciendo audio id:", id);
       const snd = new Audio(audioData.audio_url);
       snd.play();
       snd.onended = () => {
          // Limpiar el audio del servidor una vez escuchado
          if (audioData.audio_id) {
             fetch(`http://127.0.0.1:8763/api/audio/${audioData.audio_id}`, { method: 'DELETE' }).catch(e=>console.log(e));
          }
       };
    }
    setAudioQueue(prev => prev.filter(a => a.id !== id));
  };

  const handleRejectAudio = (id) => {
    showConfirm("Aviso", "¿Seguro que quieres descartar este audio prioritario?", () => {
       const audioData = audioQueue.find(a => a.id === id);
       if (audioData && audioData.audio_id) {
          fetch(`http://127.0.0.1:8763/api/audio/${audioData.audio_id}`, { method: 'DELETE' }).catch(e=>console.log(e));
       }
       setAudioQueue(prev => prev.filter(a => a.id !== id));
    });
  };

  const handleGenerateLink = async (username) => {
    try {
      const API_BASE = 'http://127.0.0.1:8763';
      const response = await fetch(`${API_BASE}/api/moderation/link`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        const link = data.url;
        await navigator.clipboard.writeText(link);
        
        // Lanzar Toast Notification
        setToastMessage("Invitación copiada en el portapapeles.");
        setTimeout(() => setToastMessage(null), 4000);
        
        // Cambiar a vista DMWebView
        setDmUrl(`https://www.tiktok.com/@${username}`);
        setActiveView('dmwebview');
        
        // Marcar donador como leído si existe
        setDonators(prev => prev.map(d => d.username === username ? { ...d, isNew: false } : d));
      } else {
        showAlert("Error", data.message);
      }
    } catch (err) {
      console.error('Error al generar enlace:', err);
      showAlert("Error", 'Error de conexión con el Backend de Python.');
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px', height: '100vh', boxSizing: 'border-box' }}>
      <Modal {...modalConfig} />
      <header className="main-navbar">
        <div className="navbar-left navbar-side" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }} onClick={() => setActiveView('main')}>
          <img src={logoImg} alt="Talking Crow Logo" className="logo-img" />
        </div>
        
        <div className="navbar-center" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={() => setActiveView('main')}>
          <img src={titleImg} alt="Talking Crow" className="title-img" />
          <p className="neon-text-purple" style={{ position: 'relative', zIndex: 10, fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '1px', margin: '0' }}>
            {activeView === 'dmwebview' ? 'WEB VIEWER' : 'Panel de Control Principal'}
          </p>
        </div>
        
        <div className="navbar-right navbar-side" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-end', position: 'relative' }}>
          
          {/* Indicador de Croins o Botón Iniciar Sesión */}
          {currentUser ? (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,255,204,0.1)', padding: '8px 15px', borderRadius: '25px', border: '1px solid var(--neon-green)', transition: 'all 0.3s' }}
              onClick={() => setActiveView('subscription')}
              title="Comprar más Croins"
            >
              <span style={{ fontSize: '1.2rem' }}>🪙</span>
              <span className="neon-text-green" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{userProfile?.Croins || 0} Croins</span>
            </div>
          ) : (
            <button className="btn-neon" style={{ padding: '8px 15px' }} onClick={() => setActiveView('login')}>Iniciar Sesión</button>
          )}

          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <img src={profileImage} alt="Menú de Usuario" className="avatar-placeholder" title="Menú de Usuario" style={{ objectFit: 'cover' }} />
            <button className="settings-gear-btn" title="Ajustes" style={{ pointerEvents: 'none' }}>⚙️</button>
          </div>
          
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
               <ul>
                 <li 
                   onClick={() => { setActiveView('account'); setIsDropdownOpen(false); }}
                   style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(157, 0, 255, 0.3)', paddingBottom: '12px', marginBottom: '8px' }}
                 >
                   <img src={profileImage} alt="Perfil" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-purple)' }} />
                   Cuenta Talking Crow
                 </li>
                 <li onClick={() => { setActiveView('subscription'); setIsDropdownOpen(false); }}>Suscripción y Pagos</li>
                 <li onClick={() => { setActiveView('support'); setIsDropdownOpen(false); }}>Contacto y soporte</li>
                 <li onClick={() => { setActiveView('port'); setIsDropdownOpen(false); }}>Configuración de Puerto</li>
                 <li onClick={() => { setActiveView('terms'); setIsDropdownOpen(false); }}>Términos y Condiciones</li>
                 <li 
                   style={{ color: '#ff6600', textAlign: 'center', borderTop: '1px solid rgba(255,102,0,0.3)', paddingTop: '12px', marginTop: '8px', fontWeight: 'bold' }} 
                   onClick={async () => { await signOut(auth); setIsDropdownOpen(false); setActiveView('main'); }}
                 >
                   Cerrar Sesión
                 </li>
                 <li 
                   style={{ color: '#ff003c', textAlign: 'center', borderTop: '1px solid rgba(255,0,60,0.3)', paddingTop: '12px', marginTop: '8px', fontWeight: 'bold', textShadow: '0 0 5px rgba(255,0,60,0.5)' }} 
                   onClick={handleShutdown}
                 >
                   Apagar Sistema
                 </li>
               </ul>
            </div>
          )}
        </div>
      </header>

      {/* Tostada de Notificación */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.9)', border: '1px solid var(--neon-green)',
          boxShadow: '0 0 15px rgba(57, 255, 20, 0.4)', color: 'var(--neon-green)',
          padding: '12px 24px', borderRadius: '8px', zIndex: 9999,
          fontWeight: 'bold', fontSize: '1rem', animation: 'fadeIn 0.3s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      {activeView === 'main' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', alignItems: 'stretch', flex: 1, minHeight: 0, paddingBottom: '10px' }}>
        
        {/* Columna 1: Configuración de Regalos */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', minHeight: 0 }}>
          <h2 className="neon-text-orange" style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(255, 117, 24, 0.3)', paddingBottom: '10px' }}>
            Configuración de Regalos
          </h2>
          
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Nombre de tu Acción / Reacción</label>
            <input type="text" placeholder="Ej. Una flor para otra flor..." value={newGiftName} onChange={e => setNewGiftName(e.target.value)} />
            
            <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Gatillo (Monedas o Clave de TikTok)</label>
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Ej. 125, o (Rose)" 
                  value={newGiftValue} 
                  onChange={e => setNewGiftValue(e.target.value)} 
                  style={{ flex: 1, minWidth: '130px', margin: 0 }} 
                />
                <button 
                  className="btn-neon btn-neon-orange" 
                  style={{ flex: 1, minWidth: '140px', margin: 0, padding: '0 15px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setIsTopGiftsOpen(!isTopGiftsOpen)}
                >
                  <span className={`accordion-arrow ${isTopGiftsOpen ? 'open' : ''}`} style={{ marginRight: '6px' }}>▶</span>
                  Top Regalos
                </button>
              </div>
              
              <div className={`accordion-content ${isTopGiftsOpen ? 'open' : ''}`}>
                <div className="dropdown-menu" style={{ animation: 'none', margin: '10px 0' }}>
                  <div className="dropdown-grid">
                    {topTikTokGifts.map(gift => (
                      <button 
                        key={gift.key} 
                        className="dropdown-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => {
                          setNewGiftValue(gift.key);
                          setIsTopGiftsOpen(false);
                        }}
                      >
                        <img src={`/gifts/${gift.img}`} alt={gift.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline-block'; }} />
                        <span style={{ display: 'none', fontSize: '1.2rem' }}>🎁</span>
                        <span className="dropdown-item-name" style={{ flex: 1 }}>{gift.name}</span>
                        <span className="dropdown-item-key">({gift.key})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexWrap: 'wrap', gap: '5px' }}>
                <label style={{ color: 'var(--text-secondary)', margin: 0, flex: 1, minWidth: '150px' }}>Script a Ejecutar (.bat, .py)</label>
                <button 
                  className="btn-neon btn-neon-orange" 
                  style={{ margin: 0, padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', flex: 1, minWidth: '130px', justifyContent: 'center' }}
                  onClick={() => setIsExampleScriptsOpen(!isExampleScriptsOpen)}
                >
                  <span className={`accordion-arrow ${isExampleScriptsOpen ? 'open' : ''}`} style={{ marginRight: '5px' }}>▶</span>
                  Example Scripts
                </button>
              </div>

              <div className={`accordion-content ${isExampleScriptsOpen ? 'open' : ''}`}>
                <div className="dropdown-menu" style={{ animation: 'none', marginBottom: '10px' }}>
                  <div className="dropdown-grid">
                    {exampleScripts.map(sc => (
                      <button 
                        key={sc.name} 
                        className="dropdown-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => {
                          setNewGiftScript(sc.code);
                          setIsExampleScriptsOpen(false);
                        }}
                      >
                        <span style={{ fontSize: '1.2rem' }}>{sc.icon}</span>
                        <span className="dropdown-item-name" style={{ flex: 1 }}>{sc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <textarea placeholder="Pega el código de tu script aquí..." value={newGiftScript} onChange={e => setNewGiftScript(e.target.value)} style={{ flex: 1, minHeight: '120px', resize: 'vertical' }} />
              
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                <button className="btn-neon" onClick={handleAddGift}>
                  Añadir Nuevo Regalo
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '10px' }}>
            <div 
              className="accordion-toggle"
              onClick={() => setIsGiftsOpen(!isGiftsOpen)} 
            >
              <h3 className="neon-text-purple" style={{ margin: 0, fontSize: '1.2rem', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center' }}>
                <span className={`accordion-arrow ${isGiftsOpen ? 'open' : ''}`}>▶</span>
                Regalos Activos
              </h3>
            </div>
            
            <div className={`accordion-content ${isGiftsOpen ? 'open' : ''}`} style={{ overflowY: 'auto', flex: 1 }}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {gifts.map((gift, index) => (
                  <li key={gift.id} className="gift-item" style={{ '--item-index': index }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>{gift.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span className="neon-text-green">{gift.value} 🪙</span>
                        <button onClick={() => handleDeleteGift(gift.id, gift.name)} style={{ background: 'transparent', border: 'none', color: '#ff003c', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' }}>✖</button>
                      </div>
                    </div>
                    <div className="gift-script-code">
                      {gift.script}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn-neon btn-neon-red" 
              style={{ width: '100%', padding: '15px', fontWeight: 'bold', fontSize: 'clamp(0.7rem, 1.5vw, 1.1rem)', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', overflow: 'hidden', whiteSpace: 'nowrap' }}
              onMouseDown={startCensorBleep}
              onMouseUp={stopCensorBleep}
              onMouseLeave={stopCensorBleep}
              onTouchStart={startCensorBleep}
              onTouchEnd={stopCensorBleep}
            >
              <span style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)' }}>🤬</span> 
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>CENSURADOR</span>
            </button>
          </div>
        </section>

        {/* Columna 2: Monitor en Vivo */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(57, 255, 20, 0.3)', paddingBottom: '10px' }}>
            <h2 className="neon-text-green" style={{ margin: 0 }}>
              Monitor en Vivo
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={toggleTts} title="Activar/Desactivar Texto a Voz Local">
              <span style={{ color: isTtsLiveEnabled ? '#39ff14' : '#ff003c', fontWeight: 'bold', fontSize: '1.05rem', textShadow: isTtsLiveEnabled ? '0 0 5px #39ff14' : '0 0 5px #ff003c', transition: 'all 0.3s' }}>TTS</span>
              <div 
                style={{ 
                  width: '46px', height: '24px', 
                  borderRadius: '12px', 
                  background: isTtsLiveEnabled ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 0, 60, 0.1)',
                  border: `2px solid ${isTtsLiveEnabled ? '#39ff14' : '#ff003c'}`,
                  position: 'relative',
                  transition: 'all 0.3s',
                  boxShadow: isTtsLiveEnabled ? '0 0 10px rgba(57,255,20,0.4)' : 'none'
                }}
              >
                <div style={{
                  position: 'absolute', top: '2px', left: isTtsLiveEnabled ? '24px' : '2px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: isTtsLiveEnabled ? '#39ff14' : '#ff003c',
                  transition: 'all 0.3s',
                  boxShadow: `0 0 8px ${isTtsLiveEnabled ? '#39ff14' : '#ff003c'}`
                }} />
              </div>
            </div>
          </div>
          
          {audioQueue.length > 0 && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', maxHeight: '30%', overflowY: 'auto' }}>
                {audioQueue.map(audio => (
                  <div key={audio.id} style={{ padding: '12px', borderLeft: '4px solid #00f0ff', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '0 8px 8px 0', animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                       <strong style={{ color: '#00f0ff', textShadow: '0 0 5px #00f0ff' }}>{audio.username}</strong>
                       <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{audio.timestamp.toLocaleTimeString()}</div>
                    </div>
                    <div style={{ margin: '8px 0', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{audio.message}"</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                       <button className="btn-neon" style={{ flex: 1, borderColor: '#00f0ff', color: '#00f0ff', padding: '5px', fontSize: '0.85rem' }} onClick={() => handlePlayAudio(audio.id)}>▶ Reproducir</button>
                       <button className="btn-neon btn-neon-red" style={{ flex: 1, padding: '5px', fontSize: '0.85rem' }} onClick={() => handleRejectAudio(audio.id)}>✖ Rechazar</button>
                    </div>
                  </div>
                ))}
             </div>
          )}
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0', minHeight: 0 }}
               ref={(el) => { if(el) el.scrollTop = el.scrollHeight; }} >
            {liveEvents.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '50px', fontStyle: 'italic', opacity: 0.7 }}>
                Esperando conexion del más allá...
              </div>
            ) : (
              liveEvents.map((evt, idx) => (
                <div key={idx} style={{ marginBottom: '15px', padding: '12px', borderLeft: '3px solid var(--neon-purple)', background: 'rgba(157, 0, 255, 0.05)', borderRadius: '0 4px 4px 0', animation: 'fadeIn 0.3s ease-out' }}>
                  <strong className="neon-text-green">{evt.username}</strong> 
                  {evt.type === 'gift' && (
                    <span> ha enviado <span className="neon-text-orange" style={{ fontWeight: 'bold' }}>
                      {evt.img_url ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {evt.message.split(' ')[0]} {/* 1x */}
                          <img src={evt.img_url} alt="Gift" style={{ height: '24px', verticalAlign: 'middle' }} />
                        </span>
                      ) : (
                        evt.message
                      )}
                    </span></span>
                  )}
                  {evt.type === 'chat' && <span> dice: <span className="neon-text-orange" style={{ fontWeight: 'bold', fontStyle: 'italic' }}>"{evt.message}"</span></span>}
                  {evt.type === 'connection' && <span> <span className="neon-text-purple" style={{ fontWeight: 'bold' }}>{evt.message}</span></span>}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{evt.timestamp.toLocaleTimeString()}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Columna 3: Configuración Base */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          
          <h2 className="neon-text-purple" style={{ textAlign: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(157, 0, 255, 0.3)', paddingBottom: '10px' }}>
            Conexión Base
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ flexShrink: 0 }}>
               {isTiktokConnected ? (
                  hostAvatar ? (
                    <img src={hostAvatar} alt="Host Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--neon-green)', boxShadow: '0 0 15px var(--neon-green)', objectFit: 'cover' }} />
                  ) : (
                    <div className="spinner-border" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-orange)', boxShadow: '0 0 15px rgba(255, 117, 24, 0.5)' }}>
                      <span style={{ fontSize: '1.5rem', animation: 'spin 2s linear infinite reverse' }}>⏳</span>
                    </div>
                  )
               ) : (
                  <img src="/avatar_user.png" alt="Placeholder Usuario" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid rgba(157, 0, 255, 0.4)', objectFit: 'cover' }} />
               )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cuenta de TikTok</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                 <input 
                    type="text" 
                    placeholder="@TuUsuarioTikTok" 
                    value={tiktokUsername} 
                    onChange={e => setTiktokUsername(e.target.value)} 
                    style={{ margin: 0, padding: '8px 12px', flex: 1, minWidth: '130px', opacity: isTiktokConnected ? 0.6 : 1 }} 
                    disabled={isTiktokConnected}
                 />
                 {isTiktokConnected ? (
                    <button className="btn-neon btn-neon-red" style={{ flex: 1, minWidth: '120px', padding: '8px 12px', fontSize: '0.85rem' }} onClick={handleDisconnect} title="Cortar Conexión">
                      Desconectar
                    </button>
                 ) : (
                    <button className="btn-neon btn-neon-orange" style={{ flex: 1, minWidth: '120px', padding: '8px 15px', fontSize: '0.9rem', margin: 0, opacity: isBackendReady ? 1 : 0.4, cursor: isBackendReady ? 'pointer' : 'not-allowed' }} disabled={!isBackendReady} onClick={handleConnect}>
                      {isBackendReady ? 'Vincular' : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando Motores<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span></span>}
                    </button>
                 )}
              </div>
              {isTiktokConnected && (
                 <span className={hostAvatar ? "neon-text-green" : "neon-text-orange"} style={{ fontWeight: 'bold', fontSize: '0.85rem', marginTop: '2px', textShadow: hostAvatar ? '0 0 8px var(--neon-green)' : '0 0 8px var(--neon-orange)' }}>
                    {hostAvatar ? 'Enlace Establecido' : <span style={{ display: 'flex', alignItems: 'center' }}>Estableciendo Enlace<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span></span>}
                 </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div 
              className="accordion-toggle"
              onClick={() => setIsDmsOpen(!isDmsOpen)} 
            >
              <h3 className="neon-text-orange" style={{ margin: 0, fontSize: '1.2rem', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center' }}>
                <span className={`accordion-arrow ${isDmsOpen ? 'open' : ''}`}>▶</span>
                DMs a Donadores
              </h3>
              {unreadCount > 0 && (
                <span style={{
                  background: '#ff003c', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8rem', fontWeight: 'bold', marginLeft: '10px'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className={`accordion-content ${isDmsOpen ? 'open' : ''}`} style={{ flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
              <div style={{ position: 'relative', marginBottom: '15px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>@</span>
                <input 
                  type="text" 
                  placeholder="Buscar usuario..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ margin: 0, paddingLeft: '35px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {donators
                  .filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase().replace('@','')))
                  .sort((a, b) => a.username.localeCompare(b.username))
                  .map(user => (
                   <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid var(--neon-orange)' }}>
                     <div>
                       <span style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                         @{user.username}
                         {user.isNew && <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#ff003c', borderRadius: '50%', boxShadow: '0 0 8px #ff003c' }}></span>}
                       </span>
                     </div>
                     <button className="btn-neon btn-neon-orange" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => handleGenerateLink(user.username)}>Generar DM</button>
                   </div>
                ))}
                {donators.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontStyle: 'italic' }}>
                    Nadie ha interactuado aún...
                  </div>
                )}
                {donators.length > 0 && donators.filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase().replace('@',''))).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontStyle: 'italic' }}>
                    No se encontró a nadie con ese nombre.
                  </div>
                )}
              </div>
            </div>
          </div>
          </section>

          {/* Paneles Extras: Efectos de Sonido y Stickers (Desplazamiento Dinámico) */}
          <div className={`extras-container ${!isDmsOpen ? 'visible' : ''}`} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
             <section className="panel custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, paddingBottom: '15px', overflowY: 'auto' }}>
                <h2 className="neon-text-purple" style={{ textAlign: 'center', marginBottom: '15px' }}>
                   Efectos de Sonido
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gridAutoRows: '35px', gap: '10px', paddingBottom: '5px' }}>
                   {sounds.map((item, i) => (
                      <button key={i} title="Clic derecho para eliminar" onContextMenu={(e) => handleDeleteSound(i, e)} className="btn-neon btn-neon-orange" style={{ height: '100%', padding: '8px 2px', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                         <span style={{ fontSize: '1rem' }}>{item.icon}</span> {item.name}
                      </button>
                   ))}
                   <div style={{ display: 'flex', height: '100%' }}>
                     <button className="btn-neon btn-neon-green" onClick={() => setActiveModal('sound')} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px 0 0 6px', borderRight: 'none', borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px' }}>+</button>
                     <button className="btn-neon btn-neon-red" onClick={() => { setActiveModal('delete-sound'); setItemsToDelete([]); }} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 6px 6px 0', borderTopWidth: '1px', borderBottomWidth: '1px', borderRightWidth: '1px' }}>-</button>
                   </div>
                </div>
             </section>

             <section className="panel custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, paddingBottom: '15px', overflowY: 'auto' }}>
                <h2 className="neon-text-purple" style={{ textAlign: 'center', marginBottom: '15px' }}>
                   Stickers
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gridAutoRows: '35px', gap: '10px', paddingBottom: '5px' }}>
                   {stickers.map((item, i) => (
                      <button key={i} title="Clic derecho para eliminar" onContextMenu={(e) => handleDeleteSticker(i, e)} className="btn-neon btn-neon-orange" style={{ height: '100%', padding: '8px 2px', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                         <span style={{ fontSize: '1rem' }}>{item.icon}</span> {item.name}
                      </button>
                   ))}
                   <div style={{ display: 'flex', height: '100%' }}>
                     <button className="btn-neon btn-neon-green" onClick={() => setActiveModal('sticker')} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px 0 0 6px', borderRight: 'none', borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px' }}>+</button>
                     <button className="btn-neon btn-neon-red" onClick={() => { setActiveModal('delete-sticker'); setItemsToDelete([]); }} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 6px 6px 0', borderTopWidth: '1px', borderBottomWidth: '1px', borderRightWidth: '1px' }}>-</button>
                   </div>
                </div>
             </section>
          </div>
        </div>

        </div>
      )}
      
      {/* VISTA DE MENSAJES DIRECTOS (WEBVIEW TIKTOK) */}
      {activeView === 'dmwebview' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button 
              className="btn-neon btn-neon-orange" 
              onClick={() => setActiveView('main')}
              style={{ fontSize: '1rem', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <span>⬅</span> Volver al Dashboard
            </button>
            <span className="neon-text-green" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Enlace copiado en el portapapeles para mensaje directo
            </span>
          </div>
          <div className="panel" style={{ flex: 1, overflow: 'hidden', padding: 0, borderRadius: '12px', border: '1px solid var(--neon-purple)', position: 'relative' }}>
            <webview 
              src={dmUrl} 
              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} 
              allowpopups="true"
            ></webview>
          </div>
        </div>
      )}

      {activeView === 'account' && <AccountPage onBack={() => setActiveView('main')} profileImage={profileImage} setProfileImage={setProfileImage} />}
      {activeView === 'subscription' && <SubscriptionPage onBack={() => setActiveView('main')} />}
      {activeView === 'login' && <Login onNavigate={(view) => setActiveView(view)} />}
      {activeView === 'register' && <Register onNavigate={(view) => setActiveView(view)} />}
      {activeView === 'port' && <PortConfigPage onBack={() => setActiveView('main')} />}
      {activeView === 'support' && <SupportPage onBack={() => setActiveView('main')} />}
      {activeView === 'terms' && <TermsPage onBack={() => setActiveView('main')} />}
      
      {/* Modal para Nuevo Ítem (Sonido/Sticker) */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div className="panel" style={{ width: '400px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 className="neon-text-purple" style={{ textAlign: 'center', margin: 0, borderBottom: '1px solid rgba(157, 0, 255, 0.3)', paddingBottom: '10px' }}>
              {activeModal.startsWith('delete') 
                ? `Borrar ${activeModal.includes('sound') ? 'Efectos' : 'Stickers'}` 
                : `Crear Nuevo ${activeModal === 'sound' ? 'Efecto de Sonido' : 'Sticker'}`
              }
            </h2>
            
            {activeModal.startsWith('delete') ? (
               <div className="custom-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto', padding: '10px 5px' }}>
                  {(activeModal === 'delete-sound' ? sounds : stickers).map((item, i) => {
                     const isSelected = itemsToDelete.includes(i);
                     return (
                       <button 
                         key={i} 
                         className={`btn-neon btn-neon-red ${isSelected ? 'selected' : ''}`}
                         style={{ padding: '8px', border: isSelected ? '2px solid #ff003c' : '1px solid rgba(255, 0, 60, 0.4)', background: isSelected ? 'rgba(255,0,60,0.1)' : 'transparent', color: isSelected ? '#ff003c' : 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
                         onClick={() => setItemsToDelete(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                       >
                         <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                         <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{item.name}</span>
                       </button>
                     );
                  })}
                  {(activeModal === 'delete-sound' ? sounds : stickers).length === 0 && (
                     <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1', textAlign: 'center' }}>No hay elementos para borrar.</div>
                  )}
               </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Nombre</label>
                  <input 
                    type="text" 
                    placeholder={activeModal === 'sound' ? "Ej. Trompeta Triste" : "Ej. Gatito"}
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    style={{ width: '100%', margin: 0 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Archivo ({activeModal === 'sound' ? 'Audio .mp3, .wav' : 'Imagen .png, .gif'})</label>
                  <input 
                    type="file" 
                    accept={activeModal === 'sound' ? 'audio/*' : 'image/png, image/gif'}
                    onChange={e => setNewItemFile(e.target.files[0])}
                    style={{
                      background: 'var(--panel-bg)',
                      color: 'white',
                      padding: '10px',
                      border: '1px solid rgba(157, 0, 255, 0.3)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '10px' }}>
              <button 
                className="btn-neon" 
                onClick={() => { setActiveModal(null); setNewItemName(''); setNewItemFile(null); setItemsToDelete([]); }}
              >
                Cancelar
              </button>
              
              {activeModal.startsWith('delete') ? (
                 <button 
                   className="btn-neon btn-neon-red"
                   disabled={itemsToDelete.length === 0}
                   style={{ opacity: itemsToDelete.length === 0 ? 0.5 : 1 }}
                   onClick={() => {
                     if (activeModal === 'delete-sound') {
                       setSounds(prev => prev.filter((_, i) => !itemsToDelete.includes(i)));
                     } else if (activeModal === 'delete-sticker') {
                       setStickers(prev => prev.filter((_, i) => !itemsToDelete.includes(i)));
                     }
                     setActiveModal(null);
                     setItemsToDelete([]);
                   }}
                 >
                   Borrar ({itemsToDelete.length})
                 </button>
              ) : (
                 <button 
                   className="btn-neon btn-neon-orange"
                   onClick={() => {
                     if (newItemName.trim()) {
                       if (activeModal === 'sound') {
                         setSounds([...sounds, { icon: '🎵', name: newItemName }]);
                       } else if (activeModal === 'sticker') {
                         setStickers([...stickers, { icon: '🖼️', name: newItemName }]);
                       }
                     }
                     setActiveModal(null);
                     setNewItemName('');
                     setNewItemFile(null);
                   }}
                 >
                   Guardar
                 </button>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default App;
