import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/auth';
import { useNavigate } from 'react-router-dom';

/**
 * Componente principal del panel de control de usuario (Dashboard).
 * 
 * AUDITORÍA Y DOCUMENTACIÓN EXTREMA:
 * Este componente actúa como el punto central de información para el usuario autenticado.
 * Muestra el estado de su cuenta, saldo de Croins, créditos de streamer y su progreso como creador.
 * 
 * 1. ¿Por qué se removió la compra de paquetes de Croins del Dashboard y se movió a la Tienda?
 *    - UI/UX y Separación de Preocupaciones: Se tomó la decisión crítica de separar la lógica 
 *      transaccional (compra con dinero real) del resumen de estado de la cuenta. Esto reduce 
 *      la sobrecarga cognitiva en el Dashboard, permitiendo al usuario ver de un vistazo sus 
 *      métricas sin el ruido visual de los paquetes de compra. Además, centralizar las compras 
 *      en la "Tienda" facilita futuras expansiones del catálogo sin afectar el layout del Dashboard.
 * 
 * 2. Decisiones críticas de diseño UI/UX:
 *    - Modularidad Visual: Se utilizan tarjetas ("cards") con bordes y brillos neón temáticos 
 *      (verde para dinero/croins, naranja para créditos de creador, morado para progreso de TikTok) 
 *      para diferenciar claramente los tipos de recursos.
 *    - Estados Vacíos / Llamados a la Acción (CTA): La alerta principal sobre la configuración 
 *      de la voz (EcoVoice) cambia de rojo (requiere acción) a verde (lista para usarse), guiando 
 *      al usuario instintivamente.
 *    - Tema Oscuro: Se mantiene un fondo oscuro y alto contraste, ideal para el público objetivo 
 *      (gamers y streamers), reduciendo la fatiga visual.
 * 
 * NOTA DE SEGURIDAD: Nunca se expone información sensible de pasarelas de pago ni claves de 
 * proveedores TTS externos de IA. Todo se lee desde el estado local `userData` inyectado por `useAuth`.
 * 
 * @returns {JSX.Element} El panel de control del usuario.
 */
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

            {userData?.tiktok_username && (
              <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid var(--neon-purple)', borderRadius: '8px', background: 'rgba(157,0,255,0.05)' }}>
                 <h3 className="neon-text-purple" style={{ marginTop: 0, marginBottom: '15px' }}>Progreso de Creador (Nivel {userData.creator_level || 1})</h3>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>El progreso se reinicia el día 1 de cada mes. Nivel 2 requiere 500 audios y 8 días de stream.</p>
                 <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Audios Monetizados</span>
                        <span className="neon-text-green">{userData.audios_mes_actual || 0}</span>
                      </div>
                      <div style={{ width: '100%', background: '#333', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(((userData.audios_mes_actual || 0) / 500) * 100, 100)}%`, background: 'var(--neon-green)', height: '100%' }}></div>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Días de Stream (+40m)</span>
                        <span className="neon-text-green">{userData.dias_mes_actual || 0}</span>
                      </div>
                      <div style={{ width: '100%', background: '#333', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(((userData.dias_mes_actual || 0) / 8) * 100, 100)}%`, background: 'var(--neon-green)', height: '100%' }}></div>
                      </div>
                    </div>
                 </div>
              </div>
            )}
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
