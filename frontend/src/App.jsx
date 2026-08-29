import React, { useState, useEffect, useRef } from 'react';
import './index.css';
import logoImg from './assets/logo.png';
import titleImg from './assets/title.png';
// Para mayor seguridad (TC-09), obtenemos ipcRenderer a través del contextBridge en lugar de require
const { ipcRenderer } = window.electron ? window.electron : { ipcRenderer: null };

import AccountPage from './pages/AccountPage';
import SubscriptionPage from './pages/SubscriptionPage';
import PortConfigPage from './pages/PortConfigPage';
import SupportPage from './pages/SupportPage';
import TermsPage from './pages/TermsPage';
import DesktopAuth from './pages/DesktopAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';
import { auth, db, functions } from './firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import NeonSelect from './components/NeonSelect';

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

const AudioPlayItem = ({ audio, isFirst, inQueue, handlePlayAudio, handleRejectAudio, delaySeconds = 1 }) => {
  const [progress, setProgress] = useState(0);
  const [actionTaken, setActionTaken] = useState('none'); // 'none', 'play', 'reject'

  const audioQueueRef = useRef([]);

  let themeColor = '#00f0ff';
  let themeBg = 'rgba(0, 240, 255, 0.1)';
  let themeGrad = 'rgba(0, 240, 255, 0.3)';
  
  if (audio.isDowngraded) {
      themeColor = '#ff4444';
      themeBg = 'rgba(255, 68, 68, 0.1)';
      themeGrad = 'rgba(255, 68, 68, 0.3)';
  } else if (audio.isEcoVoice) {
      themeColor = '#ffd700';
      themeBg = 'rgba(255, 215, 0, 0.1)';
      themeGrad = 'rgba(255, 215, 0, 0.3)';
  }

  // Manejo de audios recibidos desde IPC
  const handlePlayRef = React.useRef(handlePlayAudio);
  React.useEffect(() => { handlePlayRef.current = handlePlayAudio; }, [handlePlayAudio]);

  useEffect(() => {
    if (!isFirst) return; // Wait in queue until it becomes the first item
    
    let startTime = Date.now();
    let animationFrame;
    const DURATION = delaySeconds * 1000;

    const animate = () => {
      if (actionTaken !== 'none') return;
      if (DURATION === 0) {
        setProgress(100);
        setActionTaken('play');
        handlePlayRef.current(audio.id, audio.audio_url);
        return;
      }
      const now = Date.now();
      const elapsed = now - startTime;
      if (elapsed >= DURATION) {
        setProgress(100);
        setActionTaken('play');
        handlePlayRef.current(audio.id, audio.audio_url);
      } else {
        setProgress((elapsed / DURATION) * 100);
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [audio.id, audio.audio_url, isFirst, actionTaken]);

  const hasActed = actionTaken !== 'none';

  return (
    <div style={{ marginBottom: '15px', padding: '12px', borderLeft: `4px solid ${themeColor}`, background: themeBg, borderRadius: '0 8px 8px 0', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
         <strong style={{ color: themeColor, textShadow: `0 0 5px ${themeColor}` }}>
            {audio.username} 
            {audio.isDowngraded ? ' (Intento de Eco Voice)' : (audio.isEcoVoice ? ' Eco Voice' : ' Voz Inteligente')}
         </strong>
         <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{audio.timestamp.toLocaleTimeString()}</div>
      </div>
      <div style={{ margin: '8px 0', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{audio.message.replace(/\[.*?\]/g, '')}"</div>
      {audio.isDowngraded && (
          <div style={{ fontSize: '0.85rem', color: '#ffaa00', marginBottom: '8px' }}>
              ⚠️ Este usuario intentó usar el comando eco pero no ha cargado su voz para ser clonada.
          </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
         <button 
           className="btn-neon" 
           disabled={hasActed}
           style={{ 
             flex: 1, 
             borderColor: themeColor, 
             color: themeColor, 
             padding: '5px', 
             fontSize: '0.85rem',
             background: `linear-gradient(90deg, ${themeGrad} ${progress}%, transparent ${progress}%)`,
             boxShadow: progress > 0 ? `0 0 ${progress / 5}px ${themeColor}` : 'none',
             transition: 'box-shadow 0.1s linear',
             opacity: hasActed ? 0.7 : 1,
             cursor: hasActed ? 'default' : 'pointer'
           }} 
           onClick={() => { setActionTaken('play'); handlePlayRef.current(audio.id, audio.audio_url); }}
         >
           {actionTaken === 'play' ? (inQueue ? '🔊 Reproduciendo...' : '✅ Reproducido') : '▶ Reproducir'}
         </button>
         <button 
           className="btn-neon btn-neon-red" 
           disabled={hasActed}
           style={{ flex: 1, padding: '5px', fontSize: '0.85rem', opacity: hasActed ? 0.5 : 1, cursor: hasActed ? 'default' : 'pointer' }} 
           onClick={() => { setActionTaken('reject'); handleRejectAudio(audio.id); }}
         >
           {actionTaken === 'reject' ? '✖ Rechazado' : '✖ Rechazar'}
         </button>
      </div>
    </div>
  );
};

function App() {
  const [activeView, setActiveView] = useState('main');

  const [hashRoute, setHashRoute] = useState(window.location.hash);
  
  const { currentUser, userData, profileStatus } = useAuth();
  const [gifts, setGifts] = useState([]);
  
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const walletRef = React.useRef(null);
  
  const isMissingFields = currentUser && (!userData?.username || !(userData?.email || currentUser?.email) || !(userData?.tiktok || userData?.tiktok_username));
  const hasEverBeenPro = userData?.isPro || userData?.last_subscription_payment || userData?.stripe_account_id || (userData?.creator_earnings || 0) > 0;

  useEffect(() => {
    // El custom token confirma identidad, no que Firestore tenga perfil. Si una
    // cuenta quedó incompleta, la app dirige al flujo web que puede repararla.
    if (currentUser && profileStatus === 'missing' && activeView !== 'register') {
      setActiveView('register');
    }
  }, [activeView, currentUser, profileStatus]);
  
  // TC: Asignar créditos gratuitos de manera segura (Backend)
  useEffect(() => {
    if (currentUser && userData) {
      if (userData.has_received_app_credits === undefined) {
        const claimCredits = httpsCallable(functions, 'claimWelcomeCredits');
        claimCredits().catch(err => console.error("Error asignando créditos de bienvenida:", err));
      }
    }
  }, [currentUser, userData]);

  const getHeaderTitle = () => {
    switch(activeView) {
      case 'dmwebview': return 'WEB VIEWER';
      case 'subscription': return 'Suscripción y Pagos';
      case 'support': return 'Contacto y Soporte';
      case 'port': return 'Configuración de Puerto';
      case 'terms': return 'Términos y Condiciones';
      case 'account': return 'Cuenta Talking Cro.ow';
      default: return 'Panel de Control Principal';
    }
  };
  
  const [ttsVoice, setTtsVoice] = useState('es-MX-DaliaNeural');
  const [ttsRate, setTtsRate] = useState('+0%');
  const [ttsVolume, setTtsVolume] = useState('+0%');
  const [ttsReadUsername, setTtsReadUsername] = useState(true);
  const [ttsDelay, setTtsDelay] = useState(1);
  const [isTtsSettingsOpen, setIsTtsSettingsOpen] = useState(false);
  const [soundsVolume, setSoundsVolume] = useState('100');
  const [stickersVolume, setStickersVolume] = useState('100');

  const getDbFromPercentage = (pctStr) => {
     const val = parseInt(pctStr.replace('%','').replace('+','')) || 0;
     if (val <= 0) return Math.round((val / 100) * 60); 
     return Math.round((val / 100) * 12);
  };

  const getPercentageFromDb = (dbVal) => {
     const db = parseFloat(dbVal);
     const pct = db <= 0 ? Math.round((db / 60) * 100) : Math.round((db / 12) * 100);
     return (pct >= 0 ? '+' : '') + pct + '%';
  };

  useEffect(() => {
    const handleHash = () => setHashRoute(window.location.hash);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);
  
  React.useEffect(() => {
    const API_BASE = 'http://127.0.0.1:8763';
    
    let isMounted = true;
    const checkBackend = () => {
      fetch(API_BASE + '/api/settings')
        .then(res => {
          if (res.ok) {
            if (isMounted) setIsBackendReady(true);
            res.json().then(data => {
              if(data && isMounted) {
                 if (data.tiktok_username) setTiktokUsername(data.tiktok_username.startsWith('@') ? data.tiktok_username : '@' + data.tiktok_username);
                 if (data.tts_voice) setTtsVoice(data.tts_voice);
                 if (data.tts_rate) setTtsRate(data.tts_rate);
                 if (data.tts_volume) setTtsVolume(data.tts_volume);
                 if (data.tts_read_username !== undefined) setTtsReadUsername(data.tts_read_username === 1);
                 if (data.tts_delay !== undefined) setTtsDelay(data.tts_delay);
              }
            });
            
            fetch(API_BASE + '/api/gifts')
              .then(r => r.json())
              .then(d => { if (isMounted) setGifts(d); })
              .catch(err => console.error(err));
              
            fetch(API_BASE + '/api/tts/state')
              .then(r => r.json())
              .then(d => { 
                if (isMounted) {
                  setIsTtsLiveEnabled(d.enabled);
                  setTtsRequiredGift(d.required_gift || 'All');
                }
              })
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
      if (!window.location.hash) {
        navigator.sendBeacon('http://127.0.0.1:8763/api/shutdown');
      }
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
        body: JSON.stringify({ enabled: newState, required_gift: ttsRequiredGift })
      });
      const data = await res.json();
      setIsTtsLiveEnabled(data.enabled);
    } catch (e) {
      console.error("Error toggling TTS:", e);
    }
  };

  const changeTtsRequiredGift = async (e) => {
    const val = e.target.value;
    setTtsRequiredGift(val);
    try {
      const API_BASE = 'http://127.0.0.1:8763';
      await fetch(API_BASE + '/api/tts/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: isTtsLiveEnabled, required_gift: val })
      });
    } catch(err) {
      console.error("Error cambiando el regalo requerido para TTS:", err);
    }
  };

  const saveTtsSettings = async (voice, rate, volume, readUser, delay) => {
    const API_BASE = 'http://127.0.0.1:8763';
    const cleanUsername = tiktokUsername.replace('@', '').trim() ;
    fetch(API_BASE + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
         tiktok_username: cleanUsername, 
         base_audio_path: '',
         tts_voice: voice,
         tts_rate: rate,
         tts_volume: volume,
         tts_read_username: readUser ? 1 : 0,
         tts_delay: delay !== undefined ? delay : ttsDelay
      })
    }).catch(e => console.log(e));
  };

  const handleVoiceChange = (e) => {
    const v = e.target.value;
    setTtsVoice(v);
    saveTtsSettings(v, ttsRate, ttsVolume, ttsReadUsername, ttsDelay);
  };
  const handleRateChange = (e) => {
    const v = e.target.value;
    setTtsRate(v);
    saveTtsSettings(ttsVoice, v, ttsVolume, ttsReadUsername, ttsDelay);
  };
  const handleVolumeChange = (e) => {
    const v = e.target.value;
    setTtsVolume(v);
    saveTtsSettings(ttsVoice, ttsRate, v, ttsReadUsername, ttsDelay);
  };
  const handleReadUsernameChange = (e) => {
    const v = e.target.checked;
    setTtsReadUsername(v);
    saveTtsSettings(ttsVoice, ttsRate, ttsVolume, v, ttsDelay);
  };
  const handleDelayChange = (e) => {
    const v = parseInt(e.target.value) || 0;
    setTtsDelay(v);
    saveTtsSettings(ttsVoice, ttsRate, ttsVolume, ttsReadUsername, v);
  };

  const handleShutdown = async () => {
    if (window.location.hash) {
        window.close();
        return;
    }
    try {
      await fetch('http://127.0.0.1:8763/api/shutdown', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${window.API_KEY || ''}` }
      });
    } catch (e) {
      console.log("Servidor cerrado.");
    }
    document.body.innerHTML = "<div style='display:flex;height:100vh;background:#000;color:#ff003c;align-items:center;justify-content:center;font-family:Orbitron;font-size:2rem;text-shadow:0 0 10px #ff003c;'>SISTEMA APAGADO. YA PUEDES CERRAR LA VENTANA.</div>";
    setTimeout(() => {
       window.close();
    }, 500);
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
  
  const [tiktokUsername, setTiktokUsername] = useState(() => {
    const saved = localStorage.getItem('lastTiktokUsername');
    if (saved) return saved.startsWith('@') ? saved : '@' + saved;
    return '@';
  });

  // [DOCUMENTACIÓN EXTREMA: SOLUCIÓN A STALE CLOSURES EN EVENTOS SSE]
  // Se usan Refs (currentUserRef, userDataRef, tiktokUsernameRef) porque la función de callback
  // del EventSource (initSSE) se registra sólo una vez y crea un closure (clausura) sobre el estado inicial.
  // Si usáramos el estado directamente (currentUser, etc.), la callback vería el valor obsoleto.
  // Con useRef y useEffect, mantenemos una referencia mutable garantizando acceso al valor más reciente
  // sin necesidad de reinicializar la conexión SSE en cada cambio de estado, lo cual cortaría la conexión del live.
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  
  const userDataRef = useRef(userData);
  useEffect(() => { userDataRef.current = userData; }, [userData]);
  
  const tiktokUsernameRef = useRef(tiktokUsername);
  useEffect(() => { tiktokUsernameRef.current = tiktokUsername; }, [tiktokUsername]);
  
  const avatarFallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300f0ff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>';
  const [hostAvatar, setHostAvatar] = useState(null);
  const [isGiftsOpen, setIsGiftsOpen] = useState(false);
  const [isTopGiftsOpen, setIsTopGiftsOpen] = useState(false);
  const [isExampleScriptsOpen, setIsExampleScriptsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDmsOpen, setIsDmsOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [isTtsLiveEnabled, setIsTtsLiveEnabled] = useState(false);
  const [ttsRequiredGift, setTtsRequiredGift] = useState('All');
  const [isTtsGiftDropdownOpen, setIsTtsGiftDropdownOpen] = useState(false);
  const [isTtsDelayDropdownOpen, setIsTtsDelayDropdownOpen] = useState(false);
  const [audioQueue, setAudioQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const chatContainerRef = useRef(null);

  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDeviceSounds, setSelectedAudioDeviceSounds] = useState(localStorage.getItem('selectedAudioDeviceSounds') || 'default');
  const [selectedAudioDeviceStickers, setSelectedAudioDeviceStickers] = useState(localStorage.getItem('selectedAudioDeviceStickers') || 'default');
  const [selectedAudioDeviceTTS, setSelectedAudioDeviceTTS] = useState(localStorage.getItem('selectedAudioDeviceTTS') || 'default');

  const [donators, setDonators] = useState([]);
  
  const [sounds, setSounds] = useState([
    { icon: '🐦‍⬛', name: 'Cuervo', url: './sounds/cuervo.wav' }, 
    { icon: '👏', name: 'Aplausos', url: './sounds/aplausos.wav' }, 
    { icon: '😂', name: 'Risas', url: './sounds/trompeta.wav' },
    { icon: '🦗', name: 'Grillos', url: './sounds/grillos.wav' }, 
    { icon: '😲', name: 'Wow!', url: './sounds/wow.wav' }, 
    { icon: '🎺', name: 'Womp Womp', url: './sounds/womp.wav' },
    { icon: '🎉', name: 'Ta-Da!', url: './sounds/tada.wav' }
  ]);
  const [stickers, setStickers] = useState([
    { icon: '❤️', name: 'Corazón', url: './stickers/corazon.jpg' }, 
    { icon: '⭐', name: 'Estrella', url: './stickers/estrella.jpg' }, 
    { icon: '🔥', name: 'Fuego', url: './stickers/fuego.jpg' },
    { icon: '🐱', name: 'Gato', url: './stickers/gato.jpg' }, 
    { icon: '🗡️', name: 'Espada', url: './stickers/espada.jpg' }, 
    { icon: '👑', name: 'Corona', url: './stickers/corona.jpg' },
    { icon: '👻', name: 'Fantasma', url: './stickers/fantasma.jpg' }
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

  const [activeSticker, setActiveSticker] = useState(null);
  const broadcastRef = useRef(null);

  useEffect(() => {
    broadcastRef.current = new BroadcastChannel('talking_crow_events');
    broadcastRef.current.onmessage = (event) => {
      if (event.data.type === 'SHOW_STICKER') {
        setActiveSticker({ url: event.data.url, name: event.data.name, id: Date.now() });
        // Auto hide after 3 seconds
        setTimeout(() => setActiveSticker(prev => (prev && prev.id === event.data.id ? null : prev)), 3000);
      }
    };
    return () => broadcastRef.current.close();
  }, []);

  const handlePlayLocalSound = (item) => {
    if (item.url) {
       const snd = new Audio(item.url);
       snd.volume = Math.max(0, Math.min(1, parseFloat(soundsVolume) / 100));
       if (snd.setSinkId && selectedAudioDeviceSounds !== 'default') {
           snd.setSinkId(selectedAudioDeviceSounds).catch(err => console.error("setSinkId error (sounds):", err));
       }
       snd.play().catch(e => console.error("Error al reproducir sonido local:", e));
    }
  };

  const handleTriggerSticker = (item) => {
    if (item.audioUrl) {
       const snd = new Audio(item.audioUrl);
       snd.volume = Math.max(0, Math.min(1, parseFloat(soundsVolume) / 100));
       if (snd.setSinkId && selectedAudioDeviceSounds !== 'default') {
           snd.setSinkId(selectedAudioDeviceSounds).catch(err => console.error("setSinkId error (stickers):", err));
       }
       snd.play().catch(e => console.error("Error al reproducir audio de sticker:", e));
    }
    if (item.url && broadcastRef.current) {
        broadcastRef.current.postMessage({ type: 'SHOW_STICKER', url: item.url, name: item.name, id: Date.now() });
    }
  };

  const [activeModal, setActiveModal] = useState(null);
  const [itemsToDelete, setItemsToDelete] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemFile, setNewItemFile] = useState(null);
  const [newStickerAudioFile, setNewStickerAudioFile] = useState(null);
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
      if (walletRef.current && !walletRef.current.contains(event.target)) {
        setIsWalletOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    const API_BASE = 'http://127.0.0.1:8763';
    const token = window.API_KEY || sessionStorage.getItem('local_api_key') || '';
    
    let sse = null;
    let isCancelled = false;

    const initSSE = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/ticket`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error al obtener ticket SSE');
        const d = await res.json();
        
        if (isCancelled) return;

        sse = new EventSource(`${API_BASE}/api/live_events?ticket=${d.ticket}`);
        sse.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'room_info') {
                if (data.message === null || data.message === "") {
                   setIsTiktokConnected(false);
                   setHostAvatar(null);
                } else {
                   setHostAvatar(data.message);
                }
            } else if (data.type === 'priority_audio') {
                const newAudio = { ...data, timestamp: new Date(), id: Date.now().toString() };
                setAudioQueue(prev => [...prev, newAudio]);
                setLiveEvents(prev => [...prev.slice(-399), newAudio]);
            } else {
                const newEvent = { ...data, timestamp: new Date() };
                
                if (data.type === 'eco_command' && currentUserRef.current) {
                    let isMyLive = false;
                    const currentData = userDataRef.current;
                    const currentTiktokUser = tiktokUsernameRef.current;

                    if (currentData && (currentData.tiktok || currentData.tiktok_username)) {
                        let myVerifiedTiktok = (currentData.tiktok || currentData.tiktok_username).replace('@', '').toLowerCase().trim();
                        let monitoredTiktok = (currentTiktokUser || '').replace('@', '').toLowerCase().trim();
                        if (myVerifiedTiktok === monitoredTiktok) {
                            isMyLive = true;
                        }
                    }
                    
                    if (!isMyLive) {
                        console.log('[Sanguijuela Protect] Ignorando evento de Voz Inteligente porque estas monitoreando un Live que no es el tuyo.');
                        return;
                    }

                    let cleanUsername = data.username;
                    let cleanMessage = data.message;
                    
                    if (cleanMessage !== '') {
                        // TC-14: Obtenemos el token de autenticación.
                        // Nota: Al usar httpsCallable, Firebase Web SDK envía automáticamente
                        // el token en el header HTTP 'Authorization: Bearer <token>'.
                        // Lo obtenemos explícitamente y lo encadenamos para cumplir con las directrices de seguridad.
                        currentUserRef.current.getIdToken().then(token => {
                            const processTTS = httpsCallable(functions, 'processTTSMessage');
                            processTTS({ 
                                tiktok_username: data.uniqueId || cleanUsername, 
                                message: cleanMessage
                            }).then(result => {
                                console.log("[Voz Inteligente] Respuesta procesada con éxito:", result.data);
                            }).catch(err => {
                                console.error("[Voz Inteligente] Error llamando a Voz Inteligente:", err);
                            });
                        }).catch(err => {
                            console.error("Error obteniendo el token de autenticación:", err);
                        });
                    }
                }
                
                setDonators(prev => {
                     if (!prev.find(d => d.username === data.username)) {
                        return [{ id: Date.now().toString() + Math.random(), username: data.username, isNew: true }, ...prev];
                     }
                     return prev;
                });

                setLiveEvents(prev => {
                    const updated = [...prev, newEvent];
                    return updated.length > 400 ? updated.slice(updated.length - 400) : updated;
                });
            }
          } catch(err) {
            console.error("SSE error", err);
          }
        };
      } catch (error) {
        console.error("Error inicializando SSE:", error);
      }
    };

    initSSE();

    return () => {
      isCancelled = true;
      document.removeEventListener("mousedown", handleClickOutside);
      if (sse) sse.close();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !isTiktokConnected) return;

    const ttsRef = collection(db, 'tts_queue', currentUser.uid, 'requests');
    const unsubscribe = onSnapshot(ttsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          
          if (data.use_edge) {
            // FALLBACK DOWNGRADE: Enviar al backend local para Edge TTS
            const token = localStorage.getItem('localApiKey');
            fetch('http://127.0.0.1:8763/api/tts/fallback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: data.tiktok_username,
                    message: data.message
                })
            }).catch(err => console.error("Error en fallback Edge TTS:", err));
          } else {
            // COMPORTAMIENTO NORMAL: Eco Voice pagado
            const audioSource = `data:audio/mp3;base64,${data.audioBase64}`;
            const newAudio = { 
                type: 'priority_audio', 
                username: data.tiktok_username, 
                message: data.message,
                audio_url: audioSource,
                isEcoVoice: true,
                timestamp: new Date(), 
                id: change.doc.id 
            };
            setAudioQueue(prev => [...prev, newAudio]);
            setLiveEvents(prev => [...prev.slice(-399), newAudio]);
          }
          
          // Eliminar el documento de Firestore para no saturar la BD
          deleteDoc(doc(db, 'tts_queue', currentUser.uid, 'requests', change.doc.id)).catch(e => console.error(e));
        }
      });
    });

    return () => unsubscribe();
  }, [currentUser, isTiktokConnected]);

  useEffect(() => {
    if (isAutoScroll && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [liveEvents, isAutoScroll]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputDevices = devices.filter(device => device.kind === 'audiooutput');
        setAudioDevices(outputDevices);
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };
    fetchDevices();
    navigator.mediaDevices.ondevicechange = fetchDevices;
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
    if (!currentUser) {
       showConfirm("Acceso Denegado", "Debes iniciar sesión con tu cuenta de Talking Cro.ow antes de poder vincular tu canal de TikTok.", () => {});
       return;
    }
    if (!tiktokUsername.trim()) return;
    if (!tiktokUsername.trim().startsWith('@')) {
       showAlert("Aviso", "Es obligatorio incluir el símbolo @ al inicio del nombre de usuario de TikTok (ej. @UsuarioTikTok).");
       return;
    }
    
    setIsTiktokConnected(true);
    setHostAvatar(null);
    localStorage.setItem('lastTiktokUsername', tiktokUsername);
    
    const API_BASE = 'http://127.0.0.1:8763';
    const cleanUsername = tiktokUsername.replace('@', '').trim();
    
    fetch(API_BASE + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiktok_username: cleanUsername, base_audio_path: '', tts_voice: ttsVoice, tts_rate: ttsRate, tts_volume: ttsVolume, tts_read_username: ttsReadUsername ? 1 : 0, tts_delay: ttsDelay })
    }).catch(e => console.log(e));
    
    // Fase 5: Registrar el stream activo en Firestore para que el Servidor Central inicie la escucha
    try {
        await setDoc(doc(db, "active_streams", currentUser.uid), {
            tiktok_username: cleanUsername,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error al registrar active_stream:", e);
    }

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
        
        // Fase 5: Eliminar el registro en Firestore para que el Servidor Central deje de escuchar
        if (currentUser) {
            deleteDoc(doc(db, "active_streams", currentUser.uid)).catch(e => console.error(e));
        }
      }
    );
  };

  const handlePlayAudio = (id, url) => {
    // [DOCUMENTACIÓN EXTREMA: DECISIÓN ARQUITECTÓNICA CRÍTICA - FLUJO TTS]
    // Esta función controla la reproducción del TTS.
    // 1. Validación de créditos ANTES de reproducir (anti-abuso).
    // 2. Si no hay créditos, se purga el archivo localmente llamando a DELETE /api/audio/.
    // 3. Consumo de crédito asíncrono (consumeTTSCredit) al iniciar reproducción para optimizar latencia.
    // 4. Retención de archivo por 5 segundos post-reproducción para evitar race conditions en OBS.
    // ¡NO ALTERAR EL ORDEN DE ESTE FLUJO!
    if ((userData?.creator_credits || 0) <= 0) {
       showConfirm("Sin Créditos de Streamer", "Ya no tienes créditos para reproducir TTS. Adquiere más en la sección de Suscripciones.", () => {});
       setAudioQueue(prev => prev.filter(a => a.id !== id));
       if (id) {
           fetch(`http://127.0.0.1:8763/api/audio/${id}`, { 
             method: 'DELETE',
             headers: { 'Authorization': `Bearer ${window.API_KEY || sessionStorage.getItem('local_api_key') || ''}` }
           }).catch(e=>console.log(e));
       }
       return;
    }

    let finalUrl = url;
    let audioData = null;
    if (!finalUrl) {
      audioData = audioQueue.find(a => a.id === id);
      finalUrl = audioData ? audioData.audio_url : null;
    } else {
      audioData = audioQueue.find(a => a.id === id);
    }

    if (finalUrl) {
       console.log("Reproduciendo audio id:", id);
       
       // Consumir 1 crédito en el servidor (solo si no es Eco Voice pagado por el usuario)
       if (audioData && !audioData.isEcoVoice) {
           const consumeCredit = httpsCallable(functions, 'consumeTTSCredit');
           consumeCredit().catch(err => console.error("Error consumiendo crédito:", err));
       }

       const snd = new Audio(finalUrl);
       if (snd.setSinkId && selectedAudioDeviceTTS !== 'default') {
         snd.setSinkId(selectedAudioDeviceTTS).catch(err => console.error("setSinkId error:", err));
       }
       snd.play().catch(e => {
           console.error("Error al reproducir el audio HTML5:", e);
           setAudioQueue(prev => prev.filter(a => a.id !== id));
       });
       snd.onended = () => {
          // Limpiar el audio del servidor 5 segundos después de ser escuchado
          if (id) {
             setTimeout(() => {
                 fetch(`http://127.0.0.1:8763/api/audio/${id}`, { 
                   method: 'DELETE',
                   headers: { 'Authorization': `Bearer ${window.API_KEY || sessionStorage.getItem('local_api_key') || ''}` }
                 }).catch(e=>console.log(e));
             }, 5000);
          }
          // Y finalmente lo quitamos de la cola visual, permitiendo que avance el siguiente
          setAudioQueue(prev => prev.filter(a => a.id !== id));
       };
    } else {
       console.log("No se pudo encontrar la URL de audio para el ID:", id);
       setAudioQueue(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleRejectAudio = (id) => {
    const audioData = audioQueue.find(a => a.id === id);
    if (audioData && audioData.audio_id) {
      fetch(`http://127.0.0.1:8763/api/audio/${audioData.audio_id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${window.API_KEY || sessionStorage.getItem('local_api_key') || ''}` }
      }).catch(e=>console.log(e));
    }
    setAudioQueue(prev => prev.filter(a => a.id !== id));
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
    <div style={{ padding: hashRoute ? '10px' : '30px', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: hashRoute ? '10px' : '30px', height: '100vh', boxSizing: 'border-box', background: hashRoute ? '#050505' : 'transparent' }}>
      <Modal {...modalConfig} />
      
      {!hashRoute && (
        <>
      <header className="main-navbar">
        <div className="navbar-left navbar-side" onClick={() => setActiveView('main')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logoImg} alt="Talking Cro.ow Logo" className="logo-img" />
        </div>
        
        <div className="navbar-center" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={() => setActiveView('main')}>
          <img src={titleImg} alt="Talking Cro.ow" className="title-img" />
          <p className="neon-text-purple" style={{ position: 'relative', zIndex: 10, fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '1px', margin: '0' }}>
            {getHeaderTitle()}
          </p>
        </div>
        
        <div className="navbar-right navbar-side" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-end', position: 'relative' }}>
          
          {/* Indicador de Croins o Botón Iniciar Sesión */}
          {currentUser ? (
            <div style={{ position: 'relative' }} ref={walletRef}>
              <button 
                className="btn-neon" 
                style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', height: '40px' }}
                onClick={() => setIsWalletOpen(!isWalletOpen)}
                title="Mi Billetera"
              >
                <span style={{ fontSize: '1.4rem', transform: 'translateY(-3px)' }}>💳</span>
                <span className="neon-text-green" style={{ fontWeight: 'bold', letterSpacing: '1px', transform: 'translateY(1px)' }}>WALLET</span>
              </button>
              
              {isWalletOpen && (
                <div className="user-dropdown-menu" style={{ width: '220px', right: 0, padding: '10px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', borderBottom: '1px solid rgba(0, 240, 255, 0.2)', paddingBottom: '8px' }}>
                    Saldos Disponibles
                  </div>
                  <div className="credits-wrapper" style={{ flexDirection: 'column', gap: '10px', display: 'flex', alignItems: 'stretch' }}>
                    <div 
                      className="header-indicator"
                      style={{ background: 'rgba(0,255,204,0.1)', border: '1px solid var(--neon-green)', width: '100%', justifyContent: 'flex-start', padding: '8px 15px', boxSizing: 'border-box' }}
                      onClick={() => { setActiveView('subscription'); setIsWalletOpen(false); }}
                    >
                      <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>🪙</span>
                      <span className="neon-text-green" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{((userData?.purchased_croins || 0) + (userData?.promotional_croins || 0))} Croins</span>
                    </div>
                    
                    {(userData?.has_received_app_credits || userData?.creator_credits > 0 || userData?.isPro) && (
                      <div 
                        className="header-indicator"
                        style={{ background: 'rgba(255,117,24,0.1)', border: '1px solid var(--neon-orange)', width: '100%', justifyContent: 'flex-start', padding: '8px 15px', boxSizing: 'border-box' }}
                        onClick={() => { setActiveView('subscription'); setIsWalletOpen(false); }}
                      >
                        <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>✨</span>
                        <span className="neon-text-orange" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{userData?.creator_credits || 0} Créditos</span>
                      </div>
                    )}

                    <div 
                      className="header-indicator"
                      style={{ background: 'rgba(157, 0, 255, 0.1)', border: '1px solid var(--neon-purple)', width: '100%', justifyContent: 'flex-start', padding: '8px 15px', boxSizing: 'border-box' }}
                      onClick={() => {
                        if (window.backend && window.backend.open_url) {
                          window.backend.open_url('https://talkingcroow.com/withdraw');
                        } else {
                          window.open('https://talkingcroow.com/withdraw', '_blank');
                        }
                        setIsWalletOpen(false);
                      }}
                    >
                      <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>💰</span>
                      <span className="neon-text-purple" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {((userData?.creator_earnings || 0) * (28 / 12)).toFixed(2)} Croin Cash
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="btn-neon" style={{ padding: '8px 15px' }} onClick={() => setActiveView('login')}>Iniciar Sesión</button>
          )}

          {currentUser && (
            <>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <img src={currentUser?.photoURL || './avatar_user.png'} alt="Menú de Usuario" className="avatar-placeholder" title="Menú de Usuario" style={{ objectFit: 'cover' }} />
                <button className="settings-gear-btn" title="Ajustes" style={{ pointerEvents: 'none' }}>
                  ⚙️
                  {isMissingFields && <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#ff003c', borderRadius: '50%', boxShadow: '0 0 8px #ff003c', animation: 'pulse 1.5s infinite' }}></span>}
                </button>
              </div>
              
              {isDropdownOpen && (
                <div className="user-dropdown-menu">
                   <ul>
                     <li 
                       onClick={() => { setActiveView('account'); setIsDropdownOpen(false); }}
                       style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(157, 0, 255, 0.3)', paddingBottom: '12px', marginBottom: '8px', color: '#00f0ff', fontWeight: 'bold' }}
                     >
                       <img src={currentUser?.photoURL || './avatar_user.png'} alt="Perfil" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-purple)' }} />
                       <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                         <span>Cuenta Talking Cro.ow</span>
                         {isMissingFields && <span style={{ width: '8px', height: '8px', backgroundColor: '#ff003c', borderRadius: '50%', boxShadow: '0 0 8px #ff003c', animation: 'pulse 1.5s infinite' }}></span>}
                       </div>
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
            </>
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
                        <img src={`./gifts/${gift.img}`} alt={gift.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline-block'; }} />
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
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: isTtsGiftDropdownOpen ? 'visible' : 'hidden', minHeight: 0, zIndex: isTtsGiftDropdownOpen ? 100 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid rgba(57, 255, 20, 0.3)', paddingBottom: '10px' }}>
            <h2 className="neon-text-green" style={{ margin: 0 }}>
              Monitor en Vivo
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={toggleTts} title="Activar/Desactivar Texto a Voz Local">
              <span style={{ color: isTtsLiveEnabled ? '#39ff14' : '#ff003c', fontWeight: 'bold', fontSize: '1.05rem', textShadow: isTtsLiveEnabled ? '0 0 5px #39ff14' : '0 0 5px #ff003c', transition: 'all 0.3s' }}>TTS</span>
              <div 
                style={{ 
                  width: '40px', height: '24px', 
                  borderRadius: '12px', 
                  background: isTtsLiveEnabled ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 0, 60, 0.1)',
                  border: `2px solid ${isTtsLiveEnabled ? '#39ff14' : '#ff003c'}`,
                  position: 'relative',
                  transition: 'all 0.3s',
                  boxShadow: isTtsLiveEnabled ? '0 0 10px rgba(57,255,20,0.4)' : 'none',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  position: 'absolute', top: '1px', left: isTtsLiveEnabled ? '16px' : '1px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: isTtsLiveEnabled ? '#39ff14' : '#ff003c',
                  transition: 'all 0.3s',
                  boxShadow: `0 0 8px ${isTtsLiveEnabled ? '#39ff14' : '#ff003c'}`
                }} />
              </div>
            </div>
          </div>
          

          <div 
            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0', minHeight: 0, position: 'relative' }}
            ref={chatContainerRef}
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.target;
              const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
              setIsAutoScroll(isAtBottom);
            }}
          >
            {liveEvents.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '50px', fontStyle: 'italic', opacity: 0.7 }}>
                Esperando conexion del más allá...
              </div>
            ) : (
              liveEvents.map((evt, idx) => (
                evt.type === 'priority_audio' ? (
                  <AudioPlayItem 
                    key={evt.id || idx} 
                    audio={evt} 
                    isFirst={audioQueue.length > 0 && audioQueue[0].id === evt.id} 
                    inQueue={audioQueue.some(a => a.id === evt.id)}
                    handlePlayAudio={handlePlayAudio} 
                    handleRejectAudio={handleRejectAudio} 
                    delaySeconds={ttsDelay}
                    selectedAudioDeviceTTS={selectedAudioDeviceTTS}
                  />
                ) : (
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
                  {evt.type === 'chat' && <span> dice: <span className="neon-text-orange" style={{ fontWeight: 'bold', fontStyle: 'italic' }}>"{evt.message.replace(/\[.*?\]/g, '')}"</span></span>}
                  {evt.type === 'connection' && <span> <span className="neon-text-purple" style={{ fontWeight: 'bold' }}>{evt.message}</span></span>}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>{evt.timestamp.toLocaleTimeString()}</div>
                </div>
                )
              ))
            )}
          </div>
          {!isAutoScroll && (
            <button
              onClick={() => {
                setIsAutoScroll(true);
                if (chatContainerRef.current) {
                  chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
              }}
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,255,204,0.8)',
                color: '#000',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(0,255,204,0.5)',
                zIndex: 10,
                fontSize: '1.2rem',
                fontWeight: 'bold'
              }}
              title="Volver abajo"
            >
              V
            </button>
          )}
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
                    <img src={hostAvatar} alt="Host Avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--neon-green)', boxShadow: '0 0 15px var(--neon-green)', objectFit: 'cover' }} referrerPolicy="no-referrer" onError={(e) => { e.target.onerror = null; e.target.src = avatarFallback; }} />
                  ) : (
                    <div className="spinner-border" style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neon-orange)', boxShadow: '0 0 15px rgba(255, 117, 24, 0.5)' }}>
                      <span style={{ fontSize: '1.5rem', animation: 'spin 2s linear infinite reverse' }}>⏳</span>
                    </div>
                  )
               ) : (
                  <img src="./avatar_user.png" alt="Placeholder Usuario" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid rgba(157, 0, 255, 0.4)', objectFit: 'cover' }} />
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

          {/* Panel de Configuración TTS */}
          <div className={`extras-container ${!isDmsOpen ? 'visible' : ''}`} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '5px' }}>
             
             {/* Panel de Configuración TTS original */}
             <section className="panel" style={{ overflow: isTtsGiftDropdownOpen ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', gap: '15px', flexShrink: 0 }}>
                
                {/* Cabecera original (título, dropdown y engranaje) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                     <h2 className="neon-text-orange" style={{ margin: 0, fontSize: '1.2rem', textAlign: 'left' }}>Configuración TTS</h2>
                   </div>

                   <button 
                     onClick={() => setIsTtsSettingsOpen(!isTtsSettingsOpen)}
                     style={{ background: 'transparent', border: 'none', color: 'var(--neon-orange)', fontSize: '1.1rem', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                   >
                     <span style={{ transition: 'transform 0.3s ease', transform: isTtsSettingsOpen ? 'rotate(90deg)' : 'rotate(0deg)', fontSize: '0.8rem' }}>▶</span>
                     <span style={{ transition: 'transform 0.3s ease', transform: isTtsSettingsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>⚙️</span>
                   </button>
                </div>

                {/* Contenido del Acordeón (Voces y Velocidad) */}
                <div className={`accordion-content ${isTtsSettingsOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '15px', flexShrink: 0, overflow: (isTtsGiftDropdownOpen || isTtsDelayDropdownOpen) ? 'visible' : '' }}>
                   
                   {/* Nueva sección de Filtro y Retraso */}
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px', border: '1px solid rgba(255,117,24,0.3)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Filtro por Regalos</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                         <button 
                           className="btn-neon btn-neon-orange"
                           onClick={() => setIsTtsGiftDropdownOpen(!isTtsGiftDropdownOpen)}
                           style={{
                             padding: '5px 10px',
                             fontSize: '0.9rem',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             minWidth: '60px',
                             height: '32px',
                             margin: 0,
                             gap: '8px',
                             background: '#111'
                           }}
                           title="Regalo requerido para TTS"
                         >
                           <span className={`accordion-arrow ${isTtsGiftDropdownOpen ? 'open' : ''}`} style={{ fontSize: '0.7rem' }}>▶</span>
                           {ttsRequiredGift === 'All' ? 'All' : (
                             <img 
                               src={`./gifts/${topTikTokGifts.find(g => g.key === ttsRequiredGift)?.img || 'rose.png'}`} 
                               alt={ttsRequiredGift} 
                               style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
                               onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline-block'; }}
                             />
                           )}
                           {ttsRequiredGift !== 'All' && <span style={{ display: 'none', fontSize: '1.2rem' }}>🎁</span>}
                         </button>

                         {isTtsGiftDropdownOpen && (
                           <>
                             <div 
                               style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
                               onClick={() => setIsTtsGiftDropdownOpen(false)}
                             />
                             <div style={{ 
                               position: 'absolute', 
                               top: '100%', 
                               left: '50%',
                               transform: 'translateX(-50%)',
                               marginTop: '5px',
                               background: '#111', 
                               border: '1px solid var(--neon-orange)', 
                               borderRadius: '5px',
                               zIndex: 9999,
                               maxHeight: '200px',
                               overflowY: 'auto',
                               display: 'flex',
                               flexDirection: 'column',
                               gap: '5px',
                               padding: '5px',
                               boxShadow: '0 0 15px rgba(255,140,0,0.6)'
                             }}>
                               <div 
                                 onClick={() => { changeTtsRequiredGift({target:{value:'All'}}); setIsTtsGiftDropdownOpen(false); }}
                                 style={{ padding: '5px 10px', cursor: 'pointer', color: '#ff7700', textAlign: 'center', fontWeight: 'bold' }}
                               >
                                 All
                               </div>
                               {topTikTokGifts.map(g => (
                                 <div 
                                   key={g.key}
                                   onClick={() => { changeTtsRequiredGift({target:{value:g.key}}); setIsTtsGiftDropdownOpen(false); }}
                                   style={{ padding: '5px', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                                   title={g.name}
                                 >
                                   <img src={`./gifts/${g.img}`} alt={g.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                 </div>
                               ))}
                             </div>
                           </>
                         )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Segundos antes de reproducción</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <button 
                            className="btn-neon btn-neon-orange"
                            onClick={() => setIsTtsDelayDropdownOpen(!isTtsDelayDropdownOpen)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '120px',
                              height: '32px',
                              margin: 0,
                              gap: '8px',
                              background: '#111'
                            }}
                          >
                            <span className={`accordion-arrow ${isTtsDelayDropdownOpen ? 'open' : ''}`} style={{ fontSize: '0.7rem' }}>▶</span>
                            {ttsDelay === 0 ? '0s (Inmediato)' : `${ttsDelay} SEGUNDO${ttsDelay > 1 ? 'S' : ''}`}
                          </button>

                          {isTtsDelayDropdownOpen && (
                            <>
                              <div 
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
                                onClick={() => setIsTtsDelayDropdownOpen(false)}
                              />
                              <div style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '5px',
                                background: '#111', 
                                border: '1px solid var(--neon-orange)', 
                                borderRadius: '5px',
                                zIndex: 9999,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                padding: '5px',
                                boxShadow: '0 0 15px rgba(255,140,0,0.6)',
                                width: '100%'
                              }}>
                                {[0, 1, 2, 3].map(val => (
                                  <div 
                                    key={val}
                                    className="gift-item"
                                    onClick={() => {
                                      handleDelayChange({ target: { value: val } });
                                      setIsTtsDelayDropdownOpen(false);
                                    }}
                                    style={{ 
                                      padding: '8px', 
                                      cursor: 'pointer', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      borderRadius: '3px',
                                      background: ttsDelay === val ? 'rgba(255,140,0,0.2)' : 'transparent',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    {val === 0 ? '0s (Inmediato)' : `${val} SEGUNDO${val > 1 ? 'S' : ''}`}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Voz Inteligente: <span style={{ color: 'var(--neon-orange)' }}>
                          {[
                             { id: 'es-MX-DaliaNeural', name: 'Dalia (MX)' },
                             { id: 'es-MX-JorgeNeural', name: 'Jorge (MX)' },
                             { id: 'es-ES-ElviraNeural', name: 'Elvira (ES)' },
                             { id: 'es-ES-AlvaroNeural', name: 'Álvaro (ES)' }
                          ].find(v => v.id === ttsVoice)?.name || ''}
                        </span>
                      </label>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 75px)', justifyContent: 'center', gap: '20px' }}>
                         {[
                           { id: 'es-MX-DaliaNeural', img: './IAvATARFem (1).png', name: 'Dalia (MX)' },
                           { id: 'es-MX-JorgeNeural', img: './IAvATARMasc (1).png', name: 'Jorge (MX)' },
                           { id: 'es-ES-ElviraNeural', img: './IAvATARFem (2).png', name: 'Elvira (ES)' },
                           { id: 'es-ES-AlvaroNeural', img: './IAvATARMasc (2).png', name: 'Álvaro (ES)' }
                         ].map(voice => (
                            <div 
                              key={voice.id}
                              onClick={async () => {
                                setTtsVoice(voice.id);
                                saveTtsSettings(voice.id, ttsRate, ttsVolume, ttsReadUsername, ttsDelay);
                                try {
                                  const username = userData?.username || 'Usuario';
                                  const API_BASE = 'http://127.0.0.1:8763';
                                  const res = await fetch(API_BASE + '/api/tts/test', {
                                    method: 'POST',
                                    headers: { 
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${window.API_KEY || sessionStorage.getItem('local_api_key') || ''}`
                                    },
                                    body: JSON.stringify({ text: `Hola ${username}`, voice: voice.id })
                                  });
                                  const data = await res.json();
                                  if (data.audio_url) {
                                    const token = window.API_KEY || sessionStorage.getItem('local_api_key') || '';
                                    const audio = new Audio(`${API_BASE}${data.audio_url}?token=${token}`);
                                    if (audio.setSinkId && selectedAudioDeviceTTS !== 'default') {
                                      audio.setSinkId(selectedAudioDeviceTTS).catch(err => console.error("setSinkId error:", err));
                                    }
                                    audio.play().catch(e => console.error('Audio autoplay error:', e));
                                  }
                                } catch (e) { console.error('Error probando voz:', e); }
                              }}
                              style={{
                                position: 'relative',
                                cursor: 'pointer',
                                border: ttsVoice === voice.id ? '2px solid var(--neon-orange)' : '2px solid transparent',
                                boxShadow: ttsVoice === voice.id ? '0 0 10px var(--neon-orange)' : 'none',
                                transition: 'all 0.3s ease',
                                aspectRatio: '1',
                                overflow: 'hidden',
                                borderRadius: '15px'
                              }}
                            >
                              <img src={voice.img} alt={voice.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                         ))}
                      </div>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Velocidad de Locución</span>
                        <span style={{ color: '#00f0ff' }}>{ttsRate}</span>
                      </label>
                      <div className="obs-fader-container">
                         <div className="speed-fader-track" style={{ '--fill-ratio': ((parseInt(ttsRate.replace('%','').replace('+','')) || 0) + 50) / 100 }}>
                           <input 
                              type="range" 
                              min="-50" max="50" step="10" 
                              value={parseInt(ttsRate.replace('%','').replace('+','')) || 0} 
                              onChange={(e) => { const val = e.target.value; handleRateChange({ target: { value: (val >= 0 ? '+' : '') + val + '%' } }); }} 
                              className="obs-fader" 
                           />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Volumen (Fuera del acordeón, pero dentro del panel) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Volumen (dB)</label>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontSize: '0.8rem', color: ttsReadUsername ? 'var(--neon-green)' : 'var(--text-secondary)' }}>Usuario Dice</span>
                       <div 
                         style={{ width: '40px', height: '22px', background: ttsReadUsername ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 0, 60, 0.1)', border: `2px solid ${ttsReadUsername ? '#39ff14' : '#ff003c'}`, borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'all 0.3s', boxShadow: ttsReadUsername ? '0 0 10px rgba(57,255,20,0.4)' : 'none' }}
                         onClick={() => handleReadUsernameChange({ target: { checked: !ttsReadUsername } })}
                       >
                         <div style={{ width: '16px', height: '16px', borderRadius: '50%', position: 'absolute', top: '1px', left: ttsReadUsername ? '19px' : '1px', background: ttsReadUsername ? '#39ff14' : '#ff003c', transition: 'all 0.3s', boxShadow: `0 0 8px ${ttsReadUsername ? '#39ff14' : '#ff003c'}` }}></div>
                       </div>
                     </div>
                   </div>
                   <div className="obs-fader-container">
                      <div className="obs-fader-track" style={{ '--fill-ratio': (getDbFromPercentage(ttsVolume) + 60) / 72 }}>
                        <input 
                           type="range" 
                           min="-60" max="12" step="1" 
                           value={getDbFromPercentage(ttsVolume)} 
                           onChange={(e) => { 
                             const pct = getPercentageFromDb(e.target.value); 
                             handleVolumeChange({ target: { value: pct } }); 
                           }} 
                           className="obs-fader" 
                        />
                      </div>
                      <span className="obs-fader-value">
                        {getDbFromPercentage(ttsVolume) > 0 ? '+' : ''}{getDbFromPercentage(ttsVolume)} dB
                      </span>
                   </div>
                   <div style={{ marginTop: '10px' }}>
                     <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Salida de Audio TTS</label>
                     <NeonSelect
                       options={[
                         { value: 'default', label: 'Por Defecto del Sistema' },
                         ...audioDevices.map(device => ({ value: device.deviceId, label: device.label || `Device ${device.deviceId}` }))
                       ]}
                       value={selectedAudioDeviceTTS}
                       onChange={(val) => {
                         setSelectedAudioDeviceTTS(val);
                         localStorage.setItem('selectedAudioDeviceTTS', val);
                       }}
                       color="purple"
                     />
                   </div>
                </div>
             </section>

             <div style={{ display: 'flex', gap: '15px', height: '50px' }}>
                <button className="btn-neon btn-neon-cyan" style={{ flex: 1, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: '1.2' }} onClick={() => ipcRenderer?.send('open-secondary-window', 'sounds', 'Efectos de Sonido')}>
                   EFECTOS DE<br/>SONIDO
                </button>
                <button className="btn-neon btn-neon-cyan" style={{ flex: 1, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => ipcRenderer?.send('open-secondary-window', 'stickers', 'Stickers')}>
                   STICKERS
                </button>
              </div>
           </div>
        </div>

        </div>
      )}
      </>
      )}

      {/* RENDERIZADO DE VENTANAS SECUNDARIAS (Si hay hashRoute) */}
      {hashRoute === '#auth-desktop' && (
         <DesktopAuth onNavigate={(view) => {
             window.location.hash = '';
             setActiveView(view);
         }} />
      )}
      {hashRoute === '#sounds' && (
         <section className="panel custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, paddingBottom: '15px', overflowY: 'auto' }}>
            <h2 className="neon-text-purple" style={{ textAlign: 'center', margin: '0 0 10px 0' }}>
               Efectos de Sonido
            </h2>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
              💡 <b>En OBS:</b> Asegúrate de capturar el dispositivo de salida que elijas aquí (ej. Audio de Escritorio o Cable Virtual).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
               <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Volumen Maestro</label>
               <div className="obs-fader-container">
                 <div className="obs-fader-track" style={{ '--fill-ratio': soundsVolume / 100 }}>
                   <input type="range" min="0" max="100" step="1" value={soundsVolume} onChange={(e) => setSoundsVolume(e.target.value)} className="obs-fader" />
                 </div>
                 <span className="obs-fader-value">{soundsVolume}%</span>
               </div>
               <div style={{ marginTop: '15px' }}>
                 <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Salida de Audio Efectos de Sonido</label>
                 <NeonSelect
                   options={[
                     { value: 'default', label: 'Por Defecto del Sistema' },
                     ...audioDevices.map(device => ({ value: device.deviceId, label: device.label || `Device ${device.deviceId}` }))
                   ]}
                   value={selectedAudioDeviceSounds}
                   onChange={(val) => {
                     setSelectedAudioDeviceSounds(val);
                     localStorage.setItem('selectedAudioDeviceSounds', val);
                   }}
                   color="purple"
                 />
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gridAutoRows: '35px', gap: '10px', paddingBottom: '5px' }}>
               {sounds.map((item, i) => (
                  <button key={i} title="Clic derecho para eliminar" onClick={(e) => { handlePlayLocalSound(item); e.currentTarget.blur(); }} onContextMenu={(e) => handleDeleteSound(i, e)} className="btn-neon btn-neon-orange" style={{ height: '100%', padding: '8px 2px', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                     <span style={{ fontSize: '1rem' }}>{item.icon}</span> {item.name}
                  </button>
               ))}
               <div style={{ display: 'flex', height: '100%' }}>
                 <button className="btn-neon btn-neon-green" onClick={() => setActiveModal('sound')} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px 0 0 6px', borderRight: 'none', borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px' }}>+</button>
                 <button className="btn-neon btn-neon-red" onClick={() => { setActiveModal('delete-sound'); setItemsToDelete([]); }} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 6px 6px 0', borderTopWidth: '1px', borderBottomWidth: '1px', borderRightWidth: '1px' }}>-</button>
               </div>
            </div>
         </section>
      )}

      {hashRoute === '#stickers' && (
         <section className="panel custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, paddingBottom: '15px', overflowY: 'auto' }}>
            <h2 className="neon-text-purple" style={{ textAlign: 'center', margin: '0 0 10px 0' }}>
               Stickers
            </h2>
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '5px' }}>
              💡 <b>En OBS:</b> Agrega una <i>Fuente de Navegador</i> apuntando a:<br/>
              <code style={{ color: 'var(--neon-cyan)', userSelect: 'all' }}>http://localhost:5173/#stickers</code><br/>
              Asegúrate de marcar <b>"Permitir transparencia"</b>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '15px' }}>
               <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Volumen Maestro</label>
               <div className="obs-fader-container">
                 <div className="obs-fader-track" style={{ '--fill-ratio': stickersVolume / 100 }}>
                   <input type="range" min="0" max="100" step="1" value={stickersVolume} onChange={(e) => setStickersVolume(e.target.value)} className="obs-fader" />
                 </div>
                 <span className="obs-fader-value">{stickersVolume}%</span>
               </div>
               <div style={{ marginTop: '15px' }}>
                 <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Salida de Audio Stickers</label>
                 <NeonSelect
                   options={[
                     { value: 'default', label: 'Por Defecto del Sistema' },
                     ...audioDevices.map(device => ({ value: device.deviceId, label: device.label || `Device ${device.deviceId}` }))
                   ]}
                   value={selectedAudioDeviceStickers}
                   onChange={(val) => {
                     setSelectedAudioDeviceStickers(val);
                     localStorage.setItem('selectedAudioDeviceStickers', val);
                   }}
                   color="purple"
                 />
               </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gridAutoRows: '35px', gap: '10px', paddingBottom: '5px' }}>
               {stickers.map((item, i) => (
                  <button key={i} title="Clic derecho para eliminar" onClick={(e) => { handleTriggerSticker(item); e.currentTarget.blur(); }} onContextMenu={(e) => handleDeleteSticker(i, e)} className="btn-neon btn-neon-orange" style={{ height: '100%', padding: '8px 2px', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                     <span style={{ fontSize: '1rem' }}>{item.icon}</span> {item.name}
                  </button>
               ))}
               <div style={{ display: 'flex', height: '100%' }}>
                 <button className="btn-neon btn-neon-green" onClick={() => setActiveModal('sticker')} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px 0 0 6px', borderRight: 'none', borderTopWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px' }}>+</button>
                 <button className="btn-neon btn-neon-red" onClick={() => { setActiveModal('delete-sticker'); setItemsToDelete([]); }} style={{ flex: 1, padding: '8px', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 6px 6px 0', borderTopWidth: '1px', borderBottomWidth: '1px', borderRightWidth: '1px' }}>-</button>
               </div>
            </div>
         </section>
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

      {activeView === 'account' && <AccountPage onBack={() => setActiveView('main')} />}
      {activeView === 'subscription' && <SubscriptionPage onBack={() => setActiveView('main')} />}
      {activeView === 'login' && <Login onNavigate={(view) => setActiveView(view)} />}
      {activeView === 'register' && <Register isRecovery={profileStatus === 'missing'} onNavigate={(view) => setActiveView(view)} />}
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
                    accept={activeModal === 'sound' ? 'audio/*' : 'image/*'}
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
                {activeModal === 'sticker' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                    <label style={{ color: 'var(--text-secondary)' }}>Audio de Acompañamiento (Opcional .mp3, .wav)</label>
                    <input 
                      type="file" 
                      accept="audio/*"
                      onChange={e => setNewStickerAudioFile(e.target.files[0])}
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
                )}
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
                     if (newItemName.trim() && newItemFile) {
                       const objectUrl = URL.createObjectURL(newItemFile);
                       if (activeModal === 'sound') {
                         setSounds([...sounds, { icon: '🎵', name: newItemName, url: objectUrl }]);
                       } else if (activeModal === 'sticker') {
                         const stickerAudioUrl = newStickerAudioFile ? URL.createObjectURL(newStickerAudioFile) : null;
                         setStickers([...stickers, { icon: '🖼️', name: newItemName, url: objectUrl, audioUrl: stickerAudioUrl }]);
                       }
                     }
                     setActiveModal(null);
                     setNewItemName('');
                     setNewItemFile(null);
                     setNewStickerAudioFile(null);
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




