import React from 'react';
import { useNavigate } from 'react-router-dom';

const SupportPage = () => {
  const navigate = useNavigate();
  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '700px' }}>
      <button 
        className="btn-neon back-btn-responsive" 
        onClick={() => navigate('/dashboard')} 
      >
        &lt; Volver al Panel de Control Principal
      </button>

      <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 className="neon-text-green" style={{ margin: 0 }}>Soporte Técnico</h2>
        </div>
      
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          ¿Tienes problemas o sugerencias desde el más allá? Contáctanos.
        </p>
        
        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Asunto</label>
        <input type="text" placeholder="Ej. F5-TTS no clona mi voz..." />
        
        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Mensaje</label>
        <textarea placeholder="Describe el problema en detalle..." rows="6"></textarea>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn-neon">Enviar Mensaje</button>
        </div>
      </div>
      </div>
      <div></div>
    </div>
  );
};

export default SupportPage;
