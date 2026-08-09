import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './EcoVoices.css';

const EcoVoicesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleBuyClick = () => {
    if (currentUser) {
      navigate('/store');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="fans-container">
      {/* Hero Section */}
      <div className="fans-hero">
        <div className="fans-hero-visual">
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

        <div className="fans-hero-text">
          <h1 className="fans-title">Haz que tu Streamer te Escuche.<br/>Literalmente.</h1>
          <p className="fans-subtitle">
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
              <h3><span className="step-gray">Paso 1:</span> Regístrate en Talking Crow</h3>
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
              <p>Ve a la sección "Creadores Online", elige a quién quieres apoyar, entra a su directo en TikTok, manda tu comentario en el chat... ¡y tu mensaje se reproducirá con tu voz clonada en su transmisión!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div className="eco-packages-section">
        <h2 className="eco-section-title" style={{ marginBottom: '30px' }}>Paquetes de Croins</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          
          <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>Pack Básico</h4>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>80 Croins</h2>
            <h3 style={{ marginBottom: '20px', color: '#a0aec0' }}>$20 MXN</h3>
            <button className="btn-neon" style={{ width: '100%' }} onClick={handleBuyClick}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>Pack Popular</h4>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>320 Croins</h2>
            <h3 style={{ marginBottom: '20px', color: '#a0aec0' }}>$80 MXN</h3>
            <button className="btn-neon" style={{ width: '100%' }} onClick={handleBuyClick}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid rgba(157,0,255,0.5)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
            <h4 className="neon-text-purple" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Pack Épico</h4>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>640 Croins</h2>
            <h3 style={{ marginBottom: '20px', color: '#a0aec0' }}>$160 MXN</h3>
            <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }} onClick={handleBuyClick}>Comprar</button>
          </div>

          <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center', padding: '30px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', boxShadow: '0 0 15px rgba(255,117,24,0.2)' }}>
            <h4 className="neon-text-orange" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Pack Leyenda</h4>
            <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>1200 Croins</h2>
            <h3 style={{ marginBottom: '20px', color: '#a0aec0' }}>$300 MXN</h3>
            <button className="btn-neon btn-neon-orange" style={{ width: '100%' }} onClick={handleBuyClick}>Comprar</button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EcoVoicesPage;
