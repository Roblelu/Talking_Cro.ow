import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EcoVoices.css';

const EcoVoicesPage = () => {
  const navigate = useNavigate();

  return (
    <div className="fans-container">
      <div className="fans-hero">
        <h1 className="fans-title">Haz Ruido. Hazte Notar.</h1>
        <p className="fans-subtitle">
          Ya no eres un usuario más en el chat. Clona tu voz, elige tu avatar y haz que toda la comunidad te escuche resonar en el directo de tu creador favorito.
        </p>
        <button className="btn-fan" onClick={() => navigate('/register')}>
          Únete a la Rebelión
        </button>
      </div>

      <div className="fans-visual-area">
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

      <div className="fans-features">
        <div className="f-feature-pill">
          <span className="f-feature-icon">🤖</span>
          <h3>Clonación de Voz IA</h3>
        </div>
        <div className="f-feature-pill">
          <span className="f-feature-icon">🎭</span>
          <h3>Avatares Únicos</h3>
        </div>
        <div className="f-feature-pill">
          <span className="f-feature-icon">🚀</span>
          <h3>Reconocimiento en Vivo</h3>
        </div>
      </div>
    </div>
  );
};

export default EcoVoicesPage;
