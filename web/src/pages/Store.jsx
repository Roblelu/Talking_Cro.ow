import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../App.css';

// Inicializar Stripe con la llave pública desde el archivo .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useAuth } from '../context/AuthContext';

// Componente Interno del Formulario de Pago
const CheckoutForm = ({ streamerName, packageId, packDetails }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { currentUser, userData } = useAuth();
  
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isCardComplete, setIsCardComplete] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    let interval;
    if (processing) {
      interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 400);
    } else {
      setDots('');
    }
    return () => clearInterval(interval);
  }, [processing]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    if (!currentUser) {
      setError("Debes iniciar sesión para comprar Croins.");
      return;
    }

    const SUPER_USERS = ['cnkrxdu@gmail.com', 'roblecro.ow@gmail.com'];
    if (!SUPER_USERS.includes(currentUser.email)) {
      setError("Actualmente las compras están deshabilitadas por mantenimiento.");
      return;
    }

    if (!isCardComplete) {
      setError("Por favor, completa todos los números de tu tarjeta antes de pagar.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log("[1] Solicitando cobro seguro a Cloud Functions (onCall)...");
      const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent');
      
      // TC-02 y TC-07: Ya no enviamos uid, pero sí el packageId
      const res = await createPaymentIntent({ packageId });
      const data = res.data;

      if (!data.client_secret) throw new Error("No se recibió el client_secret del servidor");

      console.log("[2] Confirmando tarjeta en Stripe...");
      const confirmResult = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: userData?.username || currentUser.email }
        }
      });

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message);
      }

      console.log("[3] Pago Aprobado por el banco. El Webhook actualizará los Croins en breve.");
      setProcessing(false);
      setSuccess(true);
    } catch (err) {
      console.error("[ERROR GENERAL]", err);
      setProcessing(false);
      setError(err.message || "Error al procesar el pago");
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <h3 className="neon-text-green">¡Pago Exitoso!</h3>
        <p className="card-description">El pago fue autorizado. Stripe acreditará {packDetails.croins} Croins cuando el webhook confirme la operación.</p>
        <p className="card-description" style={{ marginTop: '15px' }}>¡Ve al stream de {streamerName} y escribe algo en el chat!</p>
        <button className="btn-neon" style={{ marginTop: '20px' }} onClick={() => window.location.href = '/dashboard'}>Volver al Dashboard</button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px', color: '#ff4444' }}>
        <p>Debes iniciar sesión con tu cuenta para poder recargar Croins.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px', textAlign: 'left' }}>
      <label className="card-description" style={{ display: 'block', marginBottom: '10px' }}>Usuario vinculado:</label>
      <div style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '5px', background: '#333', color: '#888', border: '1px solid #555' }}>
        @{userData?.username || currentUser.email} (UID: {currentUser.uid.substring(0, 8)}...)
      </div>

      <label className="card-description" style={{ display: 'block', marginBottom: '10px' }}>Tarjeta de Crédito / Débito:</label>
      <div style={{ padding: '15px', background: '#fff', borderRadius: '5px', marginBottom: '20px' }}>
        <CardElement 
          options={{ style: { base: { fontSize: '16px', color: '#32325d' } } }} 
          onChange={(e) => setIsCardComplete(e.complete)}
        />
      </div>

      {error && <div style={{ color: '#ff4444', marginBottom: '15px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

      <button 
        type="submit" 
        disabled={!stripe || processing} 
        className="btn-neon send-audio-btn" 
        style={{ width: '100%', opacity: (!stripe || processing) ? 0.5 : 1 }}
      >
        {processing ? `Procesando${dots}` : `Comprar ${packDetails.croins} Croins ($${packDetails.price_mxn} MXN)`}
      </button>
    </form>
  );
};

export default function Store() {
  const { streamerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const packageId = searchParams.get('packageId') || 'pack_1';
  const displayName = streamerId ? streamerId.charAt(0).toUpperCase() + streamerId.slice(1) : 'Streamer';

  const PACKAGES = {
    'pack_1': { price_mxn: 12, croins: 28 },
    'pack_2': { price_mxn: 35, croins: 110 },
    'pack_3': { price_mxn: 80, croins: 270 },
    'pack_4': { price_mxn: 140, croins: 500 },
    'pack_5': { price_mxn: 200, croins: 850 },
    'pack_6': { price_mxn: 260, croins: 1200 },
    'pack_7': { price_mxn: 330, croins: 1900 },
    'pack_8': { price_mxn: 399, croins: 2700 }
  };

  const packDetails = PACKAGES[packageId];

  if (!packDetails) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Paquete no válido. <button onClick={() => navigate('/dashboard')}>Volver</button></div>;
  }

  return (
    <div className="store-container">
      <main className="store-main">
        <div className="panel streamer-card" style={{ maxWidth: '450px', margin: '0 auto', borderColor: 'var(--neon-green)' }}>
          <div className="avatar-placeholder" style={{ margin: '0 auto 20px auto' }}></div>
          <h2 className="neon-text-green" style={{ textAlign: 'center' }}>{displayName}</h2>
          <p className="card-description" style={{ textAlign: 'center', marginBottom: '10px' }}>Recarga saldo para que la IA lea tus mensajes en mi stream.</p>
          
          <Elements stripe={stripePromise} options={{ appearance: { theme: 'night', variables: { colorPrimary: '#9d00ff', colorBackground: '#222222' } } }}>
            <CheckoutForm streamerName={displayName} packageId={packageId} packDetails={packDetails} />
          </Elements>
        </div>
      </main>
    </div>
  );
}
