import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('donador'); // 'donador' o 'streamer'

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="store-container" style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 className="neon-text-green" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Tienda y Suscripciones</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Administra tus Croins y Beneficios</p>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
        <button 
          className={`btn-neon ${activeTab === 'donador' ? 'btn-neon-green' : ''}`}
          style={{ width: '250px', opacity: activeTab === 'donador' ? 1 : 0.5 }}
          onClick={() => setActiveTab('donador')}
        >
          Usuario / Donador
        </button>
        <button 
          className={`btn-neon ${activeTab === 'streamer' ? 'btn-neon-orange' : ''}`}
          style={{ width: '250px', opacity: activeTab === 'streamer' ? 1 : 0.5, borderColor: activeTab === 'streamer' ? 'var(--neon-orange)' : 'var(--neon-green)', color: activeTab === 'streamer' ? 'var(--neon-orange)' : 'var(--neon-green)' }}
          onClick={() => setActiveTab('streamer')}
        >
          Creador / Streamer
        </button>
      </div>

      {/* Vistas Condicionales */}
      <div className="panel" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        
        {activeTab === 'donador' && (
          <div className="donador-view">
            <h3 className="neon-text-purple" style={{ marginBottom: '15px' }}>Comprar Croins 🪙</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
              Usa tus Croins para enviar mensajes de voz en tiempo real al chat de tus streamers favoritos.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              
              <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center' }}>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>Pack Básico</h4>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>80 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$20 MXN</h3>
                <button className="btn-neon" style={{ width: '100%' }}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center' }}>
                <h4 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>Pack Popular</h4>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>320 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$80 MXN</h3>
                <button className="btn-neon" style={{ width: '100%' }}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(157,0,255,0.5)', textAlign: 'center', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
                <h4 className="neon-text-purple" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Pack Épico</h4>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>640 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$160 MXN</h3>
                <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center', boxShadow: '0 0 15px rgba(255,117,24,0.2)' }}>
                <h4 className="neon-text-orange" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Pack Leyenda</h4>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>1200 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$300 MXN</h3>
                <button className="btn-neon btn-neon-orange" style={{ width: '100%' }}>Comprar</button>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'streamer' && (
          <div className="streamer-view">
            <h3 className="neon-text-orange" style={{ marginBottom: '15px' }}>Suscripción para Streamers 🎙️</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
              Activa la clonación de voz IA en tiempo real para tu transmisión y monetiza a tus fans.
            </p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
              <div className="panel" style={{ flex: 1, minWidth: '300px', border: '1px solid var(--text-secondary)' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Plan Gratuito</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Acceso básico a regalos y reacciones. Voz genérica por defecto.</p>
                <h2 style={{ marginBottom: '15px' }}>$0 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ mes</span></h2>
                <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--text-secondary)', color: 'var(--text-secondary)' }} disabled>Plan Actual</button>
              </div>
              
              <div className="panel" style={{ flex: 1, minWidth: '300px', border: '1px solid var(--neon-orange)', boxShadow: '0 0 15px rgba(255,117,24,0.1)' }}>
                <h4 className="neon-text-orange" style={{ marginBottom: '10px' }}>Plan Pro (Clonación TTS)</h4>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Clonación de voz en tiempo real con F5-TTS, respuestas ilimitadas.</p>
                <h2 className="neon-text-orange" style={{ marginBottom: '15px' }}>$125 MXN <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ mes</span></h2>
                <button className="btn-neon btn-neon-orange" style={{ width: '100%' }}>Mejorar a Pro</button>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Pagos Común */}
        <div style={{ marginTop: '20px' }}>
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

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <button className="btn-neon" style={{ borderColor: '#ff003c', color: '#ff003c' }} onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>

      </div>
    </div>
  );
}
