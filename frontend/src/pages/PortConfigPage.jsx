import React from 'react';

const PortConfigPage = ({ onBack }) => {
  return (
    <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-neon" onClick={onBack} style={{ marginRight: '20px' }}>&lt; Volver al Monitor</button>
        <h2 className="neon-text-orange" style={{ margin: 0 }}>Configuración de Red</h2>
      </div>
      
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Ajusta el puerto de escucha local. Asegúrate de que el puerto no esté en uso por otra aplicación.
        </p>
        
        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Puerto de Escucha</label>
        <input type="number" defaultValue="8763" />
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn-neon btn-neon-orange">Guardar y Reiniciar</button>
        </div>
      </div>
    </div>
  );
};

export default PortConfigPage;
