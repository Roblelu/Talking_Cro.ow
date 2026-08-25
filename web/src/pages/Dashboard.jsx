import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('donador'); // 'donador' o 'streamer'

  const handleLogout = async () => {
    await logoutUser();
    navigate('/');
  };

  return (
    <div className="store-container" style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 className="neon-text-green" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Dashboard</h2>
      </div>

      {/* Vistas */}
      <div className="panel" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%' }}>
        
          <div className="donador-view">
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <div 
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: (userData?.has_eco_voice || userData?.eco_voice_id) ? 'rgba(0,255,204,0.1)' : 'rgba(255,0,60,0.1)', 
                  border: `1px solid ${(userData?.has_eco_voice || userData?.eco_voice_id) ? 'var(--neon-green)' : '#ff003c'}`, 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onClick={() => navigate('/account')} 
                title="Ir a Cuenta Talking Cro.ow para configurar tu voz"
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontSize: '1.5rem', marginRight: '10px', verticalAlign: 'middle' }}>🎙️</span>
                <span className={(userData?.has_eco_voice || userData?.eco_voice_id) ? "neon-text-green" : ""} style={{ fontWeight: 'bold', fontSize: '1.1rem', color: (userData?.has_eco_voice || userData?.eco_voice_id) ? '' : '#ff003c', verticalAlign: 'middle' }}>
                  {(userData?.has_eco_voice || userData?.eco_voice_id) ? 'Tu voz está lista para usarse' : 'Necesitas subir tu audio (Ve a Cuenta Talking Cro.ow)'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px', padding: '20px', border: '1px solid var(--neon-green)', borderRadius: '8px', background: 'rgba(0,255,204,0.1)', textAlign: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Saldo Actual</h3>
                <h1 className="neon-text-green" style={{ fontSize: '3rem', margin: '10px 0' }}>🪙 {((userData?.purchased_croins || 0) + (userData?.promotional_croins || 0))}</h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Croins Disponibles</p>
              </div>
              
              {(userData?.has_received_app_credits || userData?.creator_credits > 0 || userData?.isPro) && (
                <div style={{ flex: 1, minWidth: '250px', padding: '20px', border: '1px solid var(--neon-orange)', borderRadius: '8px', background: 'rgba(255,117,24,0.1)', textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Créditos de Streamer</h3>
                  <h1 className="neon-text-orange" style={{ fontSize: '3rem', margin: '10px 0' }}>✨ {userData.creator_credits || 0}</h1>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Disponibles</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#ff7518', opacity: 0.9 }}>Para recargar créditos mensuales, debes ingresar desde la App de Escritorio.</p>
                </div>
              )}
            </div>

            <h3 className="neon-text-purple" style={{ marginBottom: '15px' }}>Comprar Croins 🪙</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
              Usa tus Croins para enviar mensajes de voz en tiempo real al chat de tus streamers favoritos.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              
              <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>28 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$12 MXN</h3>
                <button className="btn-neon" style={{ width: '100%' }} onClick={() => navigate('/store?packageId=pack_1')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>110 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$35 MXN</h3>
                <button className="btn-neon" style={{ width: '100%' }} onClick={() => navigate('/store?packageId=pack_2')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>270 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$80 MXN</h3>
                <button className="btn-neon" style={{ width: '100%' }} onClick={() => navigate('/store?packageId=pack_3')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(0,255,204,0.3)', textAlign: 'center' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>500 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$140 MXN</h3>
                <button className="btn-neon" style={{ width: '100%' }} onClick={() => navigate('/store?packageId=pack_4')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(157,0,255,0.5)', textAlign: 'center', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>850 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$200 MXN</h3>
                <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }} onClick={() => navigate('/store?packageId=pack_5')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid rgba(157,0,255,0.5)', textAlign: 'center', boxShadow: '0 0 15px rgba(157,0,255,0.2)' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>1200 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$260 MXN</h3>
                <button className="btn-neon" style={{ width: '100%', borderColor: 'var(--neon-purple)', color: 'var(--neon-purple)' }} onClick={() => navigate('/store?packageId=pack_6')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center', boxShadow: '0 0 15px rgba(255,117,24,0.2)' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>1900 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$330 MXN</h3>
                <button className="btn-neon btn-neon-orange" style={{ width: '100%' }} onClick={() => navigate('/store?packageId=pack_7')}>Comprar</button>
              </div>

              <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center', boxShadow: '0 0 15px rgba(255,117,24,0.2)' }}>
                <h2 className="neon-text-green" style={{ marginBottom: '10px' }}>2700 Croins</h2>
                <h3 style={{ marginBottom: '20px' }}>$399 MXN</h3>
                <button className="btn-neon btn-neon-orange" style={{ width: '100%' }} onClick={() => navigate('/store?packageId=pack_8')}>Comprar</button>
              </div>

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
