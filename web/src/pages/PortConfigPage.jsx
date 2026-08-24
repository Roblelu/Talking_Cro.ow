import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PortConfigPage = () => {
  const navigate = useNavigate();
  const [port, setPort] = useState(8763);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8763/api/config/port', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: parseInt(port) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setMessage('Error: ' + data.detail);
      }
    } catch (e) {
      setMessage('Error de conexión con el backend local.');
    }
  };

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
        <input 
          type="number" 
          value={port} 
          onChange={(e) => setPort(e.target.value)} 
          style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--neon-orange)', color: 'white', borderRadius: '4px' }}
        />
        
        {message && <p style={{ color: 'var(--neon-green)', marginTop: '15px' }}>{message}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn-neon btn-neon-orange" onClick={handleSave}>Guardar y Reiniciar</button>
        </div>
      </div>
      </div>
      <div></div>
    </div>
  );
};

export default PortConfigPage;
