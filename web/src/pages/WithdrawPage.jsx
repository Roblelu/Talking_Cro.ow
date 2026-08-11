import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

const WithdrawPage = () => {
  const { userData, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStripeOnboarding = async () => {
    setLoading(true);
    try {
      const createConnectAccount = httpsCallable(functions, 'createConnectAccount');
      const response = await createConnectAccount();
      if (response.data && response.data.url) {
        window.open(response.data.url, '_blank');
      } else {
        alert("Error al generar el link de Stripe.");
      }
    } catch (error) {
      console.error("Stripe Onboarding error:", error);
      alert("Error al iniciar configuración bancaria.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas retirar $${(userData?.creator_earnings || 0).toFixed(2)} MXN a tu cuenta bancaria?`)) return;
    
    setLoading(true);
    try {
      const requestPayout = httpsCallable(functions, 'requestPayout');
      const response = await requestPayout();
      if (response.data && response.data.success) {
        alert("¡Retiro solicitado con éxito! Los fondos llegarán a tu cuenta pronto.");
      } else {
        alert("Error al solicitar el retiro.");
      }
    } catch (error) {
      console.error("Payout error:", error);
      alert(error.message || "Error al solicitar retiro.");
    } finally {
      setLoading(false);
    }
  };

  const hasEarnings = (userData?.creator_earnings || 0) > 0;
  const isStripeConfigured = userData?.stripe_account_id && userData?.stripe_charges_enabled;

  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '800px', display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
      <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 className="neon-text-purple" style={{ margin: 0 }}>💰 Retiro de Ganancias (Croin Cash)</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Administra tus ingresos generados por mensajes de TTS y regalos.</p>
        </div>

        <div style={{ padding: '20px', background: 'rgba(157, 0, 255, 0.05)', borderRadius: '15px', border: '1px solid rgba(157, 0, 255, 0.2)', textAlign: 'center', marginBottom: '30px' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Balance Disponible</h3>
          <h1 className="neon-text-green" style={{ fontSize: '3rem', margin: '0' }}>${(userData?.creator_earnings || 0).toFixed(2)} MXN</h1>
        </div>

        {!isStripeConfigured ? (
          <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center' }}>
            <h3 className="neon-text-orange" style={{ marginBottom: '15px' }}>⚠️ Requiere Configuración Bancaria</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Para poder retirar tus ganancias, necesitas configurar tu cuenta CLABE o cuenta bancaria. 
              Utilizamos <strong>Stripe Connect</strong> para garantizar que tus transferencias sean 100% seguras e instantáneas.
            </p>
            <button 
              className="btn-neon neon-orange" 
              onClick={handleStripeOnboarding} 
              disabled={loading}
              style={{ padding: '15px 30px', fontSize: '1.1rem' }}
            >
              {loading ? 'Redirigiendo...' : 'Configurar Cuenta Bancaria (Stripe)'}
            </button>
          </div>
        ) : (
          <div className="panel" style={{ border: '1px solid var(--neon-green)', textAlign: 'center' }}>
            <h3 className="neon-text-green" style={{ marginBottom: '15px' }}>✅ Cuenta Bancaria Vinculada</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Tu cuenta bancaria está lista para recibir transferencias.
            </p>
            <button 
              className="btn-neon" 
              onClick={handlePayout} 
              disabled={loading || !hasEarnings}
              style={{ padding: '15px 30px', fontSize: '1.1rem', opacity: (!hasEarnings) ? 0.5 : 1 }}
            >
              {loading ? 'Procesando...' : `Retirar ${(userData?.creator_earnings || 0).toFixed(2)} MXN`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawPage;
