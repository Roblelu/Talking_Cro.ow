import React from 'react';

const SupportPage = ({ onBack }) => {
  return (
    <div className="panel" style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-neon" onClick={onBack} style={{ marginRight: '20px' }}>&lt; Volver al Monitor</button>
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
  );
};

export default SupportPage;
