import React from 'react';

const SubscriptionPage = ({ onBack }) => {
  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '1000px' }}>
      <button 
        className="btn-neon back-btn-responsive" 
        onClick={onBack} 
      >
        &lt; Volver al Panel de Control Principal
      </button>

      <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 className="neon-text-green" style={{ margin: 0 }}>Suscripción Activa</h2>
        </div>
      
      <div style={{ padding: '20px' }}>
        {/* Planes */}
        <h3 className="neon-text-purple" style={{ marginBottom: '15px' }}>Planes Disponibles</h3>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
          <div className="panel" style={{ flex: 1, border: '1px solid var(--text-secondary)' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Plan Gratuito</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Acceso básico a regalos y reacciones. Voz por defecto.</p>
            <h2 style={{ marginBottom: '15px' }}>$0 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ mes</span></h2>
            <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} disabled>Plan Actual</button>
          </div>
          <div className="panel" style={{ flex: 1, border: '1px solid var(--neon-orange)', boxShadow: '0 0 15px rgba(255,117,24,0.1)' }}>
            <h4 className="neon-text-orange" style={{ marginBottom: '10px' }}>Plan Pro (Clonación TTS)</h4>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Clonación de voz en tiempo real con F5-TTS, respuestas personalizadas.</p>
            <h2 className="neon-text-orange" style={{ marginBottom: '15px' }}>$9.99 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ mes</span></h2>
            <button className="btn-neon btn-neon-orange" style={{ width: '100%' }}>Mejorar a Pro</button>
          </div>
        </div>

        {/* Métodos de Pago */}
        <h3 className="neon-text-purple" style={{ marginBottom: '15px' }}>Métodos de Pago</h3>
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(157, 0, 255, 0.2)', marginBottom: '40px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>No tienes métodos de pago guardados.</p>
          <button className="btn-neon">Agregar Tarjeta</button>
        </div>

        {/* Historial de Pagos */}
        <h3 className="neon-text-purple" style={{ marginBottom: '15px' }}>Historial de Pagos</h3>
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(157, 0, 255, 0.2)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Fecha</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Descripción</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Monto</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay pagos recientes.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>
      <div></div>
    </div>
  );
};

export default SubscriptionPage;
