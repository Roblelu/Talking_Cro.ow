import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './EcoVoices.css';

const EcoVoicesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleBuyClick = (packageId) => {
    if (currentUser) {
      navigate(`/store?packageId=${packageId}`);
    } else {
      navigate('/login');
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
          <h1 className="donadores-title">Haz que tu Streamer te Escuche.<br/>Literalmente.</h1>
          <p className="donadores-subtitle">
            Olvídate del texto aburrido. Únete a Eco Voices, clona tu voz y manda mensajes en vivo para que tu streamer favorito te escuche con tu propio tono de voz.
          </p>
        </div>
      </div>

      {/* Steps Section */}
      <div className="eco-steps-section">
        <h2 className="eco-section-title">Sigue estos pasos:</h2>
        
        <div className="eco-steps-grid">
          <div className="eco-step-card">
            <div className="eco-step-icon">👤</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 1:</span> Regístrate en Talking Cro.ow</h3>
              <p>Durante el proceso vincula tu cuenta TikTok: @Nombre_de_Usuario.</p>
            </div>
          </div>

          <div className="eco-step-card">
            <div className="eco-step-icon">🎙️</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 2:</span> Clona tu voz</h3>
              <p>Se necesita un audio de 30 segundos, te daremos un texto a leer, es facil y seguro, puedes leer nuestras politicas de privacidad.</p>
            </div>
          </div>

          <div className="eco-step-card">
            <div className="eco-step-icon">🪙</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 3:</span> Recarga tus Croins</h3>
              <p>Adquiere un paquete para enviar audios, lanzar animaciones especiales e interactuar con tu voz clonada en directo con tu streamer, el programa te detectará automaticamente.</p>
            </div>
          </div>

          <div className="eco-step-card">
            <div className="eco-step-icon">🎮</div>
            <div className="eco-step-content">
              <h3><span className="step-gray">Paso 4:</span> ¡Habla en el Directo!</h3>
              <p>Ve a la sección "Creadores Online", elige a quién quieres apoyar, entra a su directo en TikTok, manda tu comentario empezando con la palabra <strong>Eco</strong>... ¡y tu mensaje se reproducirá con tu voz clonada en su transmisión!</p>
              <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '5px', display: 'inline-block', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--neon-green)' }}>💬 Ejemplo:</span> Eco hola de qué trata el directo?
              </div>
            </div>
          </div>
        </div>
      </div>

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
