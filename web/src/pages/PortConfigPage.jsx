import React from 'react';
import { useNavigate } from 'react-router-dom';

const PortConfigPage = () => {
  const navigate = useNavigate();
  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '600px' }}>
      <button 
        className="btn-neon back-btn-responsive" 
        onClick={() => navigate('/dashboard')} 
      >
        &lt; Volver al Dashboard
      </button>

      <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
      <div></div>
    </div>
  );
};

export default PortConfigPage;
