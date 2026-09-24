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
  const [generatingCoupons, setGeneratingCoupons] = useState(false);

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          
          {/* SECCIÓN DEMOGRAFÍA */}
          <div style={{ padding: '25px', border: '1px solid rgba(0, 153, 255, 0.4)', borderRadius: '12px', background: 'rgba(0, 153, 255, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ color: '#0099ff', margin: '0 0 15px 0', borderBottom: '1px solid rgba(0,153,255,0.2)', paddingBottom: '10px' }}>📊 Crecimiento y Adquisición</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Usuarios Registrados:</span>
              <strong style={{ color: '#fff', fontSize: '1.2rem' }}>{stats?.demographics?.total_users || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Creadores Activos:</span>
              <strong style={{ color: '#00ffcc', fontSize: '1.2rem' }}>{stats?.demographics?.active_creators || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Usuarios Desktop:</span>
              <strong style={{ color: '#0099ff', fontSize: '1.2rem' }}>{stats?.demographics?.desktop_users || 0}</strong>
            </div>
            
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(0,153,255,0.2)' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tasa Conversión a Creador: <span style={{ color: '#00ffcc' }}>{stats?.demographics?.total_users ? ((stats.demographics.active_creators / stats.demographics.total_users) * 100).toFixed(1) : 0}%</span>
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Tasa de Instalación PC: <span style={{ color: '#0099ff' }}>{stats?.demographics?.total_users ? ((stats.demographics.desktop_users / stats.demographics.total_users) * 100).toFixed(1) : 0}%</span>
              </p>
            </div>
          </div>

          {/* SECCIÓN LIABILITIES (DEUDAS) */}
          <div style={{ padding: '25px', border: '1px solid rgba(255, 68, 68, 0.4)', borderRadius: '12px', background: 'rgba(255, 68, 68, 0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ color: '#ff4444', margin: '0 0 15px 0', borderBottom: '1px solid rgba(255,68,68,0.2)', paddingBottom: '10px' }}>⚠️ Responsabilidades Financieras (Liabilities)</h3>
            <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
              Dinero que la plataforma le debe a los creadores y Croins promocionales que pueden ser gastados como costo operativo.
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Deuda Activa (MXN):</span>
              <strong style={{ color: '#ff4444', fontSize: '1.4rem' }}>
                ${stats?.liabilities?.total_liability_mxn?.toFixed(2) || '0.00'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Croins Promocionales en Circulación:</span>
              <strong style={{ color: '#ffcc00', fontSize: '1.2rem' }}>
                {stats?.liabilities?.total_promo_floating || 0} C
              </strong>
            </div>
          </div>
        </div>

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
                <span><strong>🎙️ Síntesis de voces Eco:</strong></span> <span style={{ color: '#fff' }}>~$0.50 MXN</span>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>🤖 Conexión al chat en vivo:</strong></span> <span style={{ color: '#fff' }}>~$0.15 MXN</span>
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
                * El margen de la empresa ya incluye el descuento de los gastos operativos fijos (síntesis de voz, conexión al chat y almacenamiento) y las comisiones de Stripe por paquete.
              </li>
            </ul>
          </div>

        </div>
        
        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid rgba(255, 0, 0, 0.3)', borderRadius: '8px', background: 'rgba(255, 0, 0, 0.05)' }}>
          <h3 className="neon-text-red" style={{ margin: '0 0 15px 0', color: '#ff4444' }}>Otorgar Saldo de Superusuario</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Añade 60 Croins o 1000 Créditos TTS a tu propia cuenta de desarrollador para hacer pruebas.</p>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              className="btn-neon" 
              style={{ borderColor: 'red', color: '#ff4444' }}
              onClick={async () => {
                if(!window.confirm('¿Seguro que quieres añadir 1000 Créditos TTS a tu cuenta?')) return;
                try {
                  const adminAdd = httpsCallable(functions, 'adminAddCredits');
                  await adminAdd({ type: 'credits' });
                  alert('1000 Créditos TTS otorgados.');
                  window.location.reload(); 
                } catch (err) {
                  alert('Error: ' + err.message);
                }
              }}
            >
              🎙️ +1000 Créditos TTS
            </button>
            
            <button 
              className="btn-neon" 
              style={{ borderColor: '#ffcc00', color: '#ffcc00' }}
              onClick={async () => {
                if(!window.confirm('¿Seguro que quieres añadir 60 Croins a tu cuenta?')) return;
                try {
                  const adminAdd = httpsCallable(functions, 'adminAddCredits');
                  await adminAdd({ type: 'croins' });
                  alert('60 Croins otorgados.');
                  window.location.reload(); 
                } catch (err) {
                  alert('Error: ' + err.message);
                }
              }}
            >
              🪙 +60 Croins
            </button>
          </div>
        </div>

        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '8px', background: 'rgba(0, 255, 255, 0.05)' }}>
          <h3 className="neon-text-blue" style={{ margin: '0 0 15px 0' }}>Generador de Cupones Promocionales</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Cada lote incluye 76 cupones de Croins (1 multi de 48, 25 de 96 y 50 de 24) y 76 cupones de créditos para TTS normal con las mismas cantidades. Todos vencen en 24 horas; cada multi permite 25 usuarios distintos.</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              className="btn-neon"
              disabled={generatingCoupons} 
              onClick={async () => {
                if (generatingCoupons) return;
                if (!window.confirm('Se crearán 152 cupones: para cada saldo, 1 multi de 48, 25 de 96 y 50 de 24. ¿Continuar?')) return;
                setGeneratingCoupons(true);
                try {
                  const generateCoupons = httpsCallable(functions, 'generateCoupons');
                  const result = await generateCoupons({ includeCredits: true });
                  if (result.data.success) {
                    const codes = result.data.coupons.map(c => `${c.code} (${c.type} - ${c.amount} ${c.currency === 'credits' ? 'Créditos TTS' : 'Croins'})`).join('\n');
                    setGeneratedCoupons(codes);
                  }
                } catch (err) {
                  alert('Error generando cupones: ' + err.message);
                } finally { setGeneratingCoupons(false); }
              }}
            >
              {generatingCoupons ? 'Generando…' : 'Generar ambos lotes (152 cupones)'}
            </button>
          </div>
          
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
          </ul>        </div>

        <div style={{ marginTop: '40px', padding: '20px', border: '1px solid rgba(0, 255, 128, 0.3)', borderRadius: '12px', background: 'rgba(0, 255, 128, 0.05)', overflowX: 'auto' }}>
          <h3 style={{ color: '#00ff80', marginBottom: '15px', borderBottom: '1px solid rgba(0,255,128,0.2)', paddingBottom: '10px' }}>📊 Curva de Precios y Rentabilidad por Paquete</h3>
          <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', textAlign: 'left', color: 'var(--text-secondary)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
                <th style={{ padding: '10px' }}>Paquete</th>
                <th style={{ padding: '10px' }}>Precio</th>
                <th style={{ padding: '10px' }}>Croins</th>
                <th style={{ padding: '10px' }}>Mensajes (12 C)</th>
                <th style={{ padding: '10px' }}>Rentabilidad Libre</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 1</td><td style={{ padding: '10px' }}>$12 MXN</td><td style={{ padding: '10px' }}>60</td><td style={{ padding: '10px' }}>5</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$2.97 MXN (24.7%)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 2</td><td style={{ padding: '10px' }}>$35 MXN</td><td style={{ padding: '10px' }}>216</td><td style={{ padding: '10px' }}>18</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$10.58 MXN (30.2%)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 3</td><td style={{ padding: '10px' }}>$80 MXN</td><td style={{ padding: '10px' }}>504</td><td style={{ padding: '10px' }}>42</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$27.08 MXN (33.8%)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 4</td><td style={{ padding: '10px' }}>$140 MXN</td><td style={{ padding: '10px' }}>888</td><td style={{ padding: '10px' }}>74</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$49.08 MXN (35.0%)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 5</td><td style={{ padding: '10px' }}>$200 MXN</td><td style={{ padding: '10px' }}>1272</td><td style={{ padding: '10px' }}>106</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$71.08 MXN (35.5%)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 6</td><td style={{ padding: '10px' }}>$260 MXN</td><td style={{ padding: '10px' }}>1668</td><td style={{ padding: '10px' }}>139</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$91.96 MXN (35.3%)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '10px' }}>Pack 7</td><td style={{ padding: '10px' }}>$330 MXN</td><td style={{ padding: '10px' }}>2124</td><td style={{ padding: '10px' }}>177</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$116.88 MXN (35.4%)</td>
              </tr>
              <tr>
                <td style={{ padding: '10px' }}>Pack 8</td><td style={{ padding: '10px' }}>$420 MXN</td><td style={{ padding: '10px' }}>2700</td><td style={{ padding: '10px' }}>225</td><td style={{ padding: '10px', color: '#00ffcc' }}>~$149.88 MXN (35.6%)</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '15px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>* Rentabilidad Libre = Precio - Tarifa Stripe (3.6% + $3) - Costo APIs ($0.70 / msg) - Creador (25%). Ya incluye el IVA en el costo inicial.</p>
        </div>

      </div>

    </div>
  );
}





