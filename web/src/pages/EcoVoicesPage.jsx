import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useUserData } from '../hooks/useUserData';
import VoiceRecorderModal from '../components/VoiceRecorderModal';

import './EcoVoices.css';


const QuickSetup = () => {
  const { currentUser, userData } = useAuth();
  const { saveProfile } = useUserData();
  
  const [tiktok, setTiktok] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [isVerifyingTiktok, setIsVerifyingTiktok] = React.useState(false);
  const [isScraping, setIsScraping] = React.useState(false);
  const [isRecorderOpen, setIsRecorderOpen] = React.useState(false);
  const [tutorialStep, setTutorialStep] = React.useState(document.body ? document.body.dataset.tutorial : null);
  
  React.useEffect(() => {
    if (userData) {
      setTiktok(userData.tiktok_username || userData.tiktok || '');
    }
  }, [userData]);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setTutorialStep(document.body.dataset.tutorial);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-tutorial'] });
    return () => observer.disconnect();
  }, []);

  if (!currentUser) {
    return (
      <div className="panel" style={{ textAlign: 'center', marginBottom: '40px', border: '1px solid var(--neon-purple)', boxShadow: '0 0 15px rgba(157,0,255,0.2)', maxWidth: '1000px', margin: '40px auto 60px auto' }}>
        <h3 className="neon-text-purple">¡Comienza a usar Eco Voices!</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Inicia sesión para vincular tu cuenta de TikTok y clonar tu voz.</p>
      </div>
    );
  }

  const generateCode = () => 'CROW-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleLinkTiktok = () => {
    if (!tiktok.trim()) {
      alert("Por favor ingresa tu usuario de TikTok.");
      return;
    }
    const currentTiktok = userData?.tiktok_username || userData?.tiktok || '';
    if (tiktok !== currentTiktok) {
      setVerificationCode('CROW-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      setIsVerifyingTiktok(true);
    } else {
      alert("Este usuario de TikTok ya está vinculado a tu cuenta.");
    }
  };

  const verifyTiktokBio = async () => {
    setIsScraping(true);
    try {
      const verifyFn = httpsCallable(functions, 'verifyTiktokBio');
      await verifyFn({ tiktokUsername: tiktok, verificationCode: verificationCode });
      await saveProfile({ tiktok: tiktok });
      alert(`¡Código ${verificationCode} encontrado con éxito en la bio de ${tiktok}! Tu cuenta ha sido vinculada.`);
      setIsVerifyingTiktok(false);
    } catch (err) {
      console.error("Error validando bio:", err);
      alert(`Error de validación: ${err.message || 'No se encontró el código'}.`);
    } finally {
      setIsScraping(false);
    }
  };

  const hasEcoVoice = userData?.has_eco_voice || userData?.eco_voice_id;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px', maxWidth: '1000px', margin: '40px auto 60px auto' }}>
      <div className={`panel ${tutorialStep === 'step2' ? 'tutorial-highlight' : ''}`} style={{ border: '1px solid rgba(0,255,204,0.3)', position: 'relative' }}>
        <h3 style={{ color: 'var(--neon-green)', marginTop: 0 }}>Vincular TikTok</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ingresa tu @usuario para verificar que la cuenta te pertenece.</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <input 
            type="text" 
            placeholder="@usuario" 
            value={tiktok} 
            onChange={(e) => setTiktok(e.target.value)} 
            style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff' }}
          />
          <button className="btn-neon" style={{ padding: '0 15px', height: '42px', margin: 0 }} onClick={() => {
            handleLinkTiktok();
            if (tutorialStep === 'step2') {
              document.body.dataset.tutorial = 'step3';
              window.dispatchEvent(new Event('tutorial_update'));
            }
          }}>
            {userData?.tiktok_username === tiktok && tiktok !== '' ? 'Vinculado' : 'Vincular'}
          </button>
        </div>
      </div>

      <div className={`panel ${tutorialStep === 'step3' ? 'tutorial-highlight' : ''}`} style={{ border: '1px solid var(--neon-purple)', position: 'relative', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
        <h3 style={{ color: 'var(--neon-purple)', marginTop: 0 }}>Clonar tu Voz</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Graba un audio rápido de 30 segundos leyendo el texto de prueba.</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' }}>
          <button 
            className="btn-neon btn-neon-orange" 
            style={{ width: '100%', margin: 0 }}
            onClick={() => {
              setIsRecorderOpen(true);
              if (tutorialStep === 'step3') {
                document.body.removeAttribute('data-tutorial');
                window.dispatchEvent(new Event('tutorial_update'));
              }
            }}
          >
            {hasEcoVoice ? 'Regrabar Voz' : 'Grabar mi Voz'}
          </button>
        </div>
      </div>

      {isVerifyingTiktok && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ border: '1px solid var(--neon-green)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(57, 255, 20, 0.2)', width: '500px' }}>
            <h3 className="modal-title neon-text-green" style={{ marginBottom: '15px' }}>Verificación de Autoría</h3>
            <p style={{ color: 'var(--text-primary)', marginBottom: '15px', lineHeight: '1.5' }}>Coloca este código temporal en tu <strong>biografía pública</strong>:</p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--neon-green)', margin: 0, letterSpacing: '2px' }}>{verificationCode}</h2>
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

      <VoiceRecorderModal 
        isOpen={isRecorderOpen} 
        onClose={() => setIsRecorderOpen(false)} 
        onSuccess={() => {
          setIsRecorderOpen(false);
          alert("Voz actualizada con éxito.");
        }} 
      />
    </div>
  );
};

const EcoVoicesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleBuyClick = (packageId) => {
    if (currentUser) {
      navigate(`/store?packageId=${packageId}`);
    } else {
      navigate('/login');
    }
  };

  const handleRedeemCoupon = async () => {
    if (!currentUser) {
      alert("Debes iniciar sesión para canjear un cupón.");
      navigate('/login');
      return;
    }
    if (!couponCode.trim()) return;
    setIsRedeeming(true);
    try {
      const redeemCoupon = httpsCallable(functions, 'redeemCoupon');
      const result = await redeemCoupon({ code: couponCode });
      if (result.data.success) {
        alert(`¡Felicidades! Has canjeado ${result.data.amount} ${result.data.currency === 'credits' ? 'créditos para TTS normal' : 'Croins promocionales'} con éxito.`);
        setCouponCode("");
      }
    } catch (err) {
      alert(err.message || "Error al canjear el cupón.");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="donadores-container">
      {/* Hero Section */}
      <div className="donadores-hero">
        <div className="donadores-hero-visual">
          <div className="chat-scroller">
            <div className="chat-track">
              {/* Primer Grupo */}
              <div className="chat-bubble-placeholder left">
                <div className="chat-line"></div>
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              <div className="chat-bubble-placeholder right">
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              <div className="chat-bubble-placeholder left">
                <div className="chat-line"></div>
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              <div className="chat-bubble-placeholder right">
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              {/* Segundo Grupo (Duplicado para el bucle continuo) */}
              <div className="chat-bubble-placeholder left">
                <div className="chat-line"></div>
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              <div className="chat-bubble-placeholder right">
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              <div className="chat-bubble-placeholder left">
                <div className="chat-line"></div>
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
              <div className="chat-bubble-placeholder right">
                <div className="chat-line"></div>
                <div className="chat-line short"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="donadores-hero-text">
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '30px', 
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
            width: '100%'
          }}>
            <input 
              type="text" 
              placeholder="Ingresa tu cupón..." 
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              style={{ 
                height: '38px',
                padding: '0 12px', 
                borderRadius: '6px', 
                border: '1px solid rgba(0, 255, 255, 0.2)', 
                background: 'rgba(0,0,0,0.4)', 
                color: '#fff', 
                outline: 'none',
                maxWidth: '200px',
                boxSizing: 'border-box',
                margin: '0',
                fontFamily: 'inherit'
              }}
            />
            <button 
              className="btn-neon" 
              style={{ 
                height: '38px', 
                padding: '0 16px', 
                fontSize: '0.9rem', 
                margin: '0', 
                boxSizing: 'border-box', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }} 
              onClick={handleRedeemCoupon} 
              disabled={isRedeeming}
            >
              {isRedeeming ? "Canjeando..." : "CANJEAR"}
            </button>
          </div>

          <h1 className="donadores-title">Haz que tu Streamer te Escuche.<br/>Literalmente.</h1>
          <p className="donadores-subtitle">
            Olvídate del texto aburrido. Únete a Eco Voices, clona tu voz y manda mensajes en vivo para que tu streamer favorito te escuche con tu propio tono de voz.
          </p>
        </div>
      </div>

      {/* Steps Section */}
      <div className="eco-steps-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 20px' }}>
          <h2 className="eco-section-title" style={{ margin: 0, textAlign: 'left' }}>Sigue estos pasos:</h2>
          {/* <button 
            className="btn-neon" 
            style={{ margin: 0 }}
            onClick={() => {
              if (!currentUser) {
                  document.body.dataset.tutorial = 'step1';
              } else {
                  document.body.dataset.tutorial = 'step2';
              }
              window.dispatchEvent(new Event('tutorial_update'));
            }}
          >
            Tutorial Gráfico
          </button> */}
        </div>
        
        <div className="eco-steps-grid">
          <div className="eco-step-card">
            <div className="eco-step-icon">👤</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 1:</span> Regístrate y Clona tu voz</h3>
              <p>Crea tu cuenta vinculando tu usuario de TikTok (@Nombre_de_Usuario) colocando un código temporal en tu Bio. Después, graba un audio rápido de 30 segundos leyendo un texto que te daremos para clonar tu voz de forma fácil y segura <em>(puedes revisar nuestras políticas de privacidad)</em>.</p>
            </div>
          </div>

          <div className="eco-step-card">
            <div className="eco-step-icon">🪙</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 2:</span> Recarga tus Croins</h3>
              <p>Adquiere un paquete para enviar audios, lanzar animaciones especiales e interactuar con tu voz clonada en directo. El programa te detectará automáticamente.</p>
            </div>
          </div>

          <div className="eco-step-card">
            <div className="eco-step-icon">🎮</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 3:</span> Ve al Directo</h3>
              <p>Dirígete a la sección "Creadores Online", elige a qué streamer afiliado quieres apoyar y entra a su directo en TikTok.</p>
            </div>
          </div>

          <div className="eco-step-card">
            <div className="eco-step-icon">💬</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 4:</span> ¡Habla en la Transmisión!</h3>
              <p>Manda tu comentario en el chat empezando con la palabra <strong>Eco</strong>... ¡y tu mensaje se reproducirá con tu propia voz clonada para que el streamer y todos te escuchen!</p>
              <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '5px', display: 'inline-block', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--neon-green)' }}>💬 Ejemplo:</span> Eco hola de qué trata el directo?
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickSetup />

      {/* Packages Section */}
      <div className="eco-packages-section">
        <h2 className="eco-section-title" style={{ marginBottom: '30px' }}>Paquetes de Croins</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>28 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$12 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a ~2 mensajes Eco</p>
            <button className="btn-neon" style={{ width: '100%' }} onClick={() => handleBuyClick('pack_1')}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>110 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$35 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a ~9 mensajes Eco</p>
            <button className="btn-neon" style={{ width: '100%' }} onClick={() => handleBuyClick('pack_2')}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>270 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$80 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a ~22 mensajes Eco</p>
            <button className="btn-neon" style={{ width: '100%' }} onClick={() => handleBuyClick('pack_3')}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>500 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$140 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a ~41 mensajes Eco</p>
            <button className="btn-neon" style={{ width: '100%' }} onClick={() => handleBuyClick('pack_4')}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(157,0,255,0.5)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>850 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$200 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a ~70 mensajes Eco</p>
            <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }} onClick={() => handleBuyClick('pack_5')}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(157,0,255,0.5)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>1200 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$260 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a 100 mensajes Eco</p>
            <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }} onClick={() => handleBuyClick('pack_6')}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(255,117,24,0.2)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>1900 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$350 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a ~158 mensajes Eco</p>
            <button className="btn-neon btn-neon-orange" style={{ width: '100%' }} onClick={() => handleBuyClick('pack_7')}>Comprar</button>
          </div>
          <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(255,117,24,0.2)' }}>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>2700 Croins</h2>
            <h3 style={{ marginBottom: '5px', color: '#a0aec0' }}>$399 MXN</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Equivale a 225 mensajes Eco</p>
            <button className="btn-neon btn-neon-orange" style={{ width: '100%' }} onClick={() => handleBuyClick('pack_8')}>Comprar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcoVoicesPage;


