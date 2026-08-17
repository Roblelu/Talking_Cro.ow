import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Mejora la interacción en tus <span className="text-glow-cyan">Streamings</span>
          </h1>
          <p className="hero-subtitle">
            Activa el texto a voz para que el chat cobre vida y escuches la voz clonada de tu comunidad.
          </p>
          <div className="hero-buttons">
            <button className="btn-hero primary" onClick={() => window.open('https://github.com/HevelG/Talking_Cro.ow/releases/latest', '_blank')}>
              Descargar App (Windows)
            </button>
            <button className="btn-hero secondary" onClick={() => navigate('/creadores')}>Soy Creador</button>
            <button className="btn-hero secondary" onClick={() => navigate('/ecovoices')}>Soy Eco Voice</button>
          </div>
        </div>
        <div className="hero-visual">
          {/* Placeholder para un visual 3D o imagen del cuervo */}
          <div className="visual-orb">
            <div className="orb-core"></div>
            <div className="orb-ring ring-1"></div>
            <div className="orb-ring ring-2"></div>
            <div className="orb-ring ring-3"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Funciones Principales</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🔊</div>
            <h3>Texto a Voz</h3>
            <p>Una comunidad con voz. Automatizamos la lectura del chat en vivo, el streamer puede seleccionar y configurar las voces.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Texto a Voz Clonada</h3>
            <p>Llevamos la personalización al extremo. Los usuarios podrán utilizar nuestro sistema para clonar sus propias voces y hablar con ella en el directo del streamer.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Efectos de Sonido y Stickers</h3>
            <p>La comunidad podrá detonar efectos de sonido y enviar animaciones visuales o stickers que se integran de forma nativa, fluida y transparente directamente en OBS.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎁</div>
            <h3>Regalos Personalizados</h3>
            <p>Control total sobre los eventos de TikTok. Asigna los regalos nativos de TikTok (rosas, leones, etc.) para que detonen alertas, reproduzcan sonidos específicos o ejecuten comandos personalizados en pantalla automáticamente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Seguridad y Moderación</h3>
            <p>Estamos comprometidos con el uso ético y responsable. Incluimos filtros de palabras, censura automática, tiempos de retraso, y un control riguroso de identidad para asegurar que la clonación de voz se utilice siempre para construir un ambiente sano y divertido.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
