import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { userData } = useAuth();
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
            <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid var(--neon-green)', borderRadius: '8px', background: 'rgba(0,255,204,0.1)', textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Saldo Actual</h3>
              <h1 className="neon-text-green" style={{ fontSize: '3rem', margin: '10px 0' }}>🪙 {((userData?.purchased_croins || 0) + (userData?.promotional_croins || 0))}</h1>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Croins Disponibles</p>
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
        )}

        {activeTab === 'streamer' && (
          <div className="streamer-view">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '20px', border: '1px solid var(--neon-orange)', borderRadius: '8px', background: 'rgba(255,117,24,0.1)', textAlign: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Creator Credits</h4>
                <h2 className="neon-text-orange" style={{ margin: '10px 0' }}>{userData?.creator_credits || 0}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Créditos para uso propio</p>
              </div>
              <div style={{ padding: '20px', border: '1px solid var(--neon-purple)', borderRadius: '8px', background: 'rgba(157,0,255,0.1)', textAlign: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Ingresos Generados</h4>
                <h2 className="neon-text-purple" style={{ margin: '10px 0' }}>🪙 {userData?.creator_earnings || 0}</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Croins convertibles a dinero</p>
              </div>
              <div style={{ padding: '20px', border: '1px solid var(--neon-green)', borderRadius: '8px', background: 'rgba(0,255,204,0.1)', textAlign: 'center' }}>
                <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Revenue Share</h4>
                <h2 className="neon-text-green" style={{ margin: '10px 0' }}>5%</h2>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Porcentaje de ganancias actual</p>
              </div>
            </div>

            <h3 className="neon-text-orange" style={{ marginBottom: '15px' }}>Suscripción para Streamers 🎙️</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px' }}>
              Activa la clonación de voz IA en tiempo real para tu transmisión y monetiza a tus donadores.
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

            <div style={{ marginTop: '40px' }}>
              <h3 className="neon-text-green" style={{ marginBottom: '15px' }}>Seguridad del Backend (Local) 🔐</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
                Pega aquí la API Key que aparece en la consola de tu backend de Python para poder usar el Panel de Moderación.
              </p>
              <div style={{ display: 'flex', gap: '10px', maxWidth: '500px' }}>
                <input 
                  type="password" 
                  placeholder="Ej: abc123def456..."
                  defaultValue={sessionStorage.getItem("local_api_key") || ""}
                  onChange={(e) => sessionStorage.setItem("local_api_key", e.target.value)}
                  style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--neon-green)', color: '#fff', borderRadius: '4px' }}
                />
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
