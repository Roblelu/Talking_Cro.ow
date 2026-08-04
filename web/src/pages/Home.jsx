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
            El Siguiente Nivel de tu <span className="text-glow-cyan">Streaming</span>
          </h1>
          <p className="hero-subtitle">
            Interactúa con tu audiencia a través de avatares reactivos, gamifica tus donaciones y crea una comunidad legendaria en Talking Crow.
          </p>
          <div className="hero-buttons">
            <button className="btn-hero primary" onClick={() => navigate('/streamers')}>Soy Streamer</button>
            <button className="btn-hero secondary" onClick={() => navigate('/fans')}>Soy Fan</button>
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
        <h2 className="section-title">¿Por qué unirte a la <span className="text-glow-purple">Bandada</span>?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎭</div>
            <h3>Avatares Reactivos</h3>
            <p>Tu cuervo u otro avatar reaccionará automáticamente a tu voz y a los eventos de tu chat en tiempo real.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💎</div>
            <h3>Sistema de Croins</h3>
            <p>Una economía virtual donde tus fans obtienen beneficios, recompensas y estatus exclusivos por apoyarte.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Gamificación Extrema</h3>
            <p>Sube de nivel, lanza retos y mantén a tu audiencia siempre activa interactuando directamente con tu overlay.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
