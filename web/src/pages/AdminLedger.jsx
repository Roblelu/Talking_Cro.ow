import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminLedger() {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatedCoupons, setGeneratedCoupons] = useState('');

  useEffect(() => {
    // Only fetch if they have an allowed email
    if (!userData?.isAdmin) {
        setError("No tienes permisos para ver esta página.");
        setLoading(false);
        return;
    }

    const fetchStats = async () => {
      try {
        const getAdminStats = httpsCallable(functions, 'getAdminStats');
        const result = await getAdminStats();
        setStats(result.data);
      } catch (err) {
        setError(err.message || 'Error cargando las estadísticas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="store-container" style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h2 className="neon-text-blue">Cargando Bóveda...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="store-container" style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ color: '#ff003c', textShadow: '0 0 10px rgba(255,0,60,0.8)' }}>Acceso Denegado</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        <button className="btn-neon" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>Volver al Inicio</button>
      </div>
    );
  }

  return (
    <div className="store-container" style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="neon-text-blue" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Dashboard de Rentabilidad</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Ledger Administrativo Oficial de Talking Cro.ow</p>
      </div>

      <div className="panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          
          <div style={{ padding: '30px', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '12px', background: 'rgba(0, 255, 255, 0.05)', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Ingresos Brutos (Gross)</h3>
            <h1 style={{ color: '#00ffff', textShadow: '0 0 15px rgba(0,255,255,0.6)', margin: 0, fontSize: '3rem' }}>
              ${stats?.platform_profit?.total_gross_mxn?.toFixed(2) || '0.00'}
            </h1>
            <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>MXN Totales Procesados</p>
          </div>

          <div style={{ padding: '30px', border: '1px solid rgba(0, 255, 204, 0.3)', borderRadius: '12px', background: 'rgba(0, 255, 204, 0.05)', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Ganancia Neta (Net Profit)</h3>
            <h1 className="neon-text-green" style={{ margin: 0, fontSize: '3rem' }}>
              ${stats?.platform_profit?.total_estimated_net_mxn?.toFixed(2) || '0.00'}
            </h1>
            <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>MXN Estimados Libres (Stripe fees descontados)</p>
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '40px' }}>
          
          <div style={{ padding: '20px', border: '1px solid rgba(255, 117, 24, 0.3)', borderRadius: '12px', background: 'rgba(255, 117, 24, 0.05)' }}>
            <h3 style={{ color: 'var(--neon-orange)', marginBottom: '15px', borderBottom: '1px solid rgba(255,117,24,0.2)', paddingBottom: '10px' }}>📉 Gastos Operativos y Fiscales (Por Mensaje)</h3>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6', listStyleType: 'none', padding: 0 }}>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>🎙️ API ElevenLabs (TTS):</strong></span> <span style={{ color: '#fff' }}>~$0.50 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>🤖 Euler Stream / Bot Nube:</strong></span> <span style={{ color: '#fff' }}>~$0.15 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>☁️ Google Cloud/Firebase:</strong></span> <span style={{ color: '#fff' }}>~$0.05 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>💳 Stripe Fee (3.6% + $3) Amortizado:</strong></span> <span style={{ color: '#fff' }}>$0.07 a $1.47 MXN</span>
              </li>
              <hr style={{ borderColor: 'rgba(255,117,24,0.2)', margin: '10px 0' }}/>
              <li style={{ color: '#ffcc00', marginBottom: '5px' }}>
                <strong>🏦 Costos Ocultos Stripe Connect (Retiros):</strong><br/>
                -$35.00 MXN mensuales por streamer activo.<br/>
                -$12.00 MXN + 0.25% por cada retiro (Payout).
              </li>
              <li style={{ color: '#ff4444', marginBottom: '5px' }}>
                <strong>🏛️ Impuestos:</strong><br/>
                -Los ingresos incluyen IVA (16%) y retenciones a declarar.
              </li>
            </ul>
          </div>

          <div style={{ padding: '20px', border: '1px solid rgba(157, 0, 255, 0.3)', borderRadius: '12px', background: 'rgba(157, 0, 255, 0.05)' }}>
            <h3 className="neon-text-purple" style={{ marginBottom: '15px', borderBottom: '1px solid rgba(157,0,255,0.2)', paddingBottom: '10px' }}>💰 Propuesta Revenue Share Escalonado (Por Mensaje)</h3>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', listStyleType: 'none', padding: 0 }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#00ffff' }}><strong>Nivel 1 (15%):</strong> Gana $0.25 MXN</span>
                <span style={{ color: '#9d00ff' }}>Margen Empresa: $0.74 a $2.72 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#00ffcc' }}><strong>Nivel 2 (20%):</strong> Gana $0.34 MXN</span>
                <span style={{ color: '#9d00ff' }}>Margen Empresa: $0.65 a $2.63 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#00ccff' }}><strong>Nivel 3 (25%):</strong> Gana $0.42 MXN</span>
                <span style={{ color: '#9d00ff' }}>Margen Empresa: $0.57 a $2.55 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#ff4444' }}><strong>Nivel 4 (30%):</strong> Gana $0.50 MXN</span>
                <span style={{ color: '#9d00ff' }}>Margen Empresa: $0.49 a $2.47 MXN</span>
              </li>
              <hr style={{ borderColor: 'rgba(157,0,255,0.2)', margin: '15px 0' }}/>
              <li style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                * El margen de la empresa ya incluye el descuento de los gastos operativos fijos (ElevenLabs, Bot, Cloud) y las comisiones de Stripe por paquete.
              </li>
            </ul>
          </div>

        </div>
        
        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid rgba(255, 0, 0, 0.3)', borderRadius: '8px', background: 'rgba(255, 0, 0, 0.05)' }}>
          <h3 className="neon-text-red" style={{ margin: '0 0 15px 0', color: '#ff4444' }}>Otorgar Saldo de Superusuario</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Añade 35 Croins y Créditos TTS a tu propia cuenta de desarrollador para hacer pruebas.</p>
          <button 
            className="btn-neon" 
            style={{ borderColor: 'red', color: '#ff4444' }}
            onClick={async () => {
              if(!window.confirm('¿Seguro que quieres añadir saldo DEV a tu cuenta?')) return;
              try {
                const adminAdd = httpsCallable(functions, 'adminAddCredits');
                await adminAdd();
                alert('Saldo DEV otorgado (35 Croins y Créditos).');
                window.location.reload(); // Reload to reflect changes in UI
              } catch (err) {
                alert('Error: ' + err.message);
              }
            }}
          >
            🛠️ Añadir +Saldo
          </button>
        </div>

        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '8px', background: 'rgba(0, 255, 255, 0.05)' }}>
          <h3 className="neon-text-blue" style={{ margin: '0 0 15px 0' }}>Generador de Cupones Promocionales</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Haz clic abajo para generar un nuevo lote de cupones (25 de 96 Croins, 50 de 24 Croins).</p>
          <button 
            className="btn-neon" 
            onClick={async () => {
              if(!window.confirm('¿Seguro que quieres generar 75 cupones nuevos?')) return;
              try {
                const generateCoupons = httpsCallable(functions, 'generateCoupons');
                const result = await generateCoupons();
                if(result.data.success) {
                  const codes = result.data.coupons.map(c => `${c.code} (${c.amount} Croins)`).join('\n');
                  setGeneratedCoupons(codes);
                  alert(`¡${result.data.coupons.length} Cupones generados con éxito!`);
                }
              } catch(err) {
                alert("Error generando cupones: " + err.message);
              }
            }}
          >
            Generar Cupones (Lote 75)
          </button>
          
          {generatedCoupons && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#00ffcc' }}>Cupones Generados:</h4>
              <textarea 
                readOnly 
                value={generatedCoupons} 
                style={{ 
                  width: '100%', 
                  height: '200px', 
                  background: 'rgba(0,0,0,0.5)', 
                  border: '1px solid rgba(0,255,255,0.3)', 
                  color: '#fff', 
                  padding: '10px', 
                  borderRadius: '5px',
                  fontFamily: 'monospace'
                }} 
              />
              <button 
                className="btn-neon" 
                style={{ marginTop: '10px', padding: '5px 10px', fontSize: '0.9rem' }}
                onClick={() => { navigator.clipboard.writeText(generatedCoupons); alert("Copiados al portapapeles"); }}
              >
                Copiar Todos
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>📋 Notas del Ledger:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Esta pestaña es confidencial y solo accesible por administradores verificados.</li>
            <li>La ganancia neta es una estimación asumiendo una comisión estándar de Stripe de 3.6% + $3.00 MXN.</li>
            <li>No se incluyen cobros revertidos o reembolsos en tiempo real.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}





