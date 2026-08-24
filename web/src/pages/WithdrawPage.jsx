import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEconomy } from '../hooks/useEconomy';

const WithdrawPage = () => {
  const { userData } = useAuth();
  const { loading, error, requestPayout, createConnectAccount, checkStripeStatus } = useEconomy();

  useEffect(() => {
    if (userData?.stripe_account_id && !userData?.stripe_charges_enabled) {
      checkStripeStatus();
    }
  }, [userData?.stripe_account_id, userData?.stripe_charges_enabled]);

  const handleStripeOnboarding = async () => {
    try {
      const data = await createConnectAccount();
      if (data && data.url) {
        window.open(data.url, '_blank');
      } else {
        alert("Error al generar el link de Stripe.");
      }
    } catch (err) {
      alert("Error al iniciar configuración bancaria.");
    }
  };

  const handlePayout = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas retirar $${(userData?.creator_earnings || 0).toFixed(2)} MXN a tu cuenta bancaria?`)) return;
    
    try {
      const data = await requestPayout();
      if (data && data.success) {
        alert("¡Retiro solicitado con éxito! Los fondos llegarán a tu cuenta pronto.");
      } else {
        alert("Error al solicitar el retiro.");
      }
    } catch (err) {
      alert(err.message || "Error al solicitar retiro.");
    }
  };

  const earnings = userData?.creator_earnings || 0;
  const isStripeConfigured = userData?.stripe_account_id && userData?.stripe_charges_enabled;

  let payoutDisabled = false;
  let payoutMessage = `Retirar ${earnings.toFixed(2)} MXN`;

  if (earnings < 300) {
      payoutDisabled = true;
      payoutMessage = "Mínimo $300 MXN requerido";
  }

  if (userData?.last_payout_date) {
      const lastDate = userData.last_payout_date.toDate ? userData.last_payout_date.toDate() : new Date(userData.last_payout_date);
      const now = new Date();
      if (lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) {
          payoutDisabled = true;
          payoutMessage = "Vuelve el próximo mes (1 retiro/mes)";
      }
  }

  const croinsEquivalent = (earnings * (28 / 12)).toFixed(2);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px', padding: '20px' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <h2 className="neon-text-purple" style={{ margin: 0, fontSize: '1.5rem' }}>💰 Retiro de Ganancias (Croin Cash)</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '5px', fontSize: '0.9rem' }}>
            Reglamento de retiros: El monto mínimo a retirar es de <strong>$300.00 MXN</strong>. Solo se permite <strong>1 retiro cada 15 días</strong>.
          </p>
        </div>

        <div style={{ padding: '15px', background: 'rgba(157, 0, 255, 0.05)', borderRadius: '10px', border: '1px solid rgba(157, 0, 255, 0.2)', textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '1rem' }}>Balance Disponible</h3>
          <h1 className="neon-text-green" style={{ fontSize: '2.5rem', margin: '0' }}>
            {croinsEquivalent} Croin Cash
          </h1>
          <p className="neon-text-orange" style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>
            (Equivalente a ${earnings.toFixed(2)} MXN)
          </p>
        </div>

        {!isStripeConfigured ? (
          <div className="panel" style={{ border: '1px solid var(--neon-orange)', textAlign: 'center' }}>
            <h3 className="neon-text-orange" style={{ marginBottom: '15px' }}>Requiere Configuración Bancaria</h3>
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
              {loading ? 'Cargando...' : 'Configurar Cuenta Bancaria (Stripe)'}
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
              disabled={loading || payoutDisabled}
              style={{ padding: '15px 30px', fontSize: '1.1rem', opacity: (payoutDisabled) ? 0.5 : 1 }}
            >
              {loading ? 'Procesando...' : payoutMessage}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawPage;

