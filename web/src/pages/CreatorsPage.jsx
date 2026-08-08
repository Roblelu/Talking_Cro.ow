import React from 'react';
import './Creators.css';

const CreatorsPage = () => {
  return (
    <div className="streamers-container">
      <div className="streamers-hero">
        <div className="streamers-text">
          <h1 className="streamers-title">Potencia tu Stream<br/>en TikTok</h1>
          <p className="streamers-subtitle">
            Convierte a tu audiencia en participantes activos. Permite que tus fans donen y hablen a través de sus avatares o voces clonadas en tu transmisión en vivo.
          </p>
          <button className="btn-streamer" onClick={() => alert('Descarga de la app en construcción...')}>
            Descargar App (Windows)
          </button>
        </div>
        
        <div className="streamers-visual">
          <div className="dashboard-placeholder">
            <div className="dash-header"></div>
            <div className="dash-body">
              <div className="dash-sidebar"></div>
              <div className="dash-main"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="streamers-features">
        <div className="s-feature-card">
          <div className="s-feature-icon">🎙️</div>
          <h3>Voces Clonadas</h3>
          <p>Tus fans pueden enviar mensajes en tiempo real con voces idénticas a las suyas. Controla y modera todo desde tu panel.</p>
        </div>
        <div className="s-feature-card">
          <div className="s-feature-icon">🔌</div>
          <h3>Overlay Transparente</h3>
          <p>Se integra nativamente a tu transmisión de TikTok Live con un overlay limpio que muestra animaciones dinámicas.</p>
        </div>
        <div className="s-feature-card">
          <div className="s-feature-icon">💎</div>
          <h3>Monetización Directa</h3>
          <p>Motiva más interacciones cobrando "Croins" o utilizando los regalos nativos de TikTok para activar eventos especiales.</p>
        </div>
      </div>
    </div>
  );
};

export default CreatorsPage;
