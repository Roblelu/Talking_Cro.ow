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
            <h3 style={{ color: 'var(--neon-orange)', marginBottom: '15px', borderBottom: '1px solid rgba(255,117,24,0.2)', paddingBottom: '10px' }}>📉 Gastos Fijos Mensuales (Estimados)</h3>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.8', listStyleType: 'none', padding: 0 }}>
              <li><strong>Infraestructura:</strong> Firebase (Base de Datos, Storage, Hosting)</li>
              <li><strong>APIs de IA:</strong> PremiumTTS (TTS Multilingüe)</li>
              <li><strong>Dominios:</strong> talkingcroow.com (Anual)</li>
              <li><strong>Marketing y Publicidad:</strong> Pauta para atraer creadores</li>
            </ul>
          </div>

          <div style={{ padding: '20px', border: '1px solid rgba(157, 0, 255, 0.3)', borderRadius: '12px', background: 'rgba(157, 0, 255, 0.05)' }}>
            <h3 className="neon-text-purple" style={{ marginBottom: '15px', borderBottom: '1px solid rgba(157,0,255,0.2)', paddingBottom: '10px' }}>🍰 División de Ganancias (Revenue Share)</h3>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.8', listStyleType: 'none', padding: 0 }}>
              <li><span style={{ color: '#00ffff' }}>1. Comisión Stripe:</span> ~3.6% + $3.00 MXN por transacción.</li>
              <li><span style={{ color: '#00ffcc' }}>2. Creadores (Streamers):</span> Escalonado entre 5% y 30% del volumen, según el partner.</li>
              <li><span style={{ color: '#9d00ff' }}>3. Gastos Operativos:</span> Se descuentan los gastos fijos mensuales.</li>
              <li><span style={{ color: '#fff' }}>4. Utilidad Neta (Socios):</span> El remanente se divide entre los fundadores/socios.</li>
            </ul>
          </div>

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





