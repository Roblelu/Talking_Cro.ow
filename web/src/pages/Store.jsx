import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { doc, setDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import '../App.css';

// Inicializar Stripe con la llave pública desde el archivo .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente Interno del Formulario de Pago
const CheckoutForm = ({ streamerName, streamerId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [tiktokUser, setTiktokUser] = useState('');
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

    if (!tiktokUser.startsWith('@')) {
      setError("Tu usuario de TikTok debe empezar con '@'");
      return;
    }

    if (!isCardComplete) {
      setError("Por favor, completa todos los números de tu tarjeta antes de pagar.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Buscamos el UID del usuario correspondiente al username ingresado:
      const cleanUsername = tiktokUser.startsWith('@') ? tiktokUser.substring(1) : tiktokUser;
      
      const fansRef = collection(db, 'streamers', streamerId.toLowerCase(), 'fans');
      const q = query(fansRef, where("username", "==", cleanUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("El usuario no existe en la base de datos. Pide al streamer o revisa tu registro.");
      }

      const fanDoc = querySnapshot.docs[0];
      const fanUid = fanDoc.id;

      console.log("[1] Solicitando cobro seguro a Cloud Functions...");
      // 2. Pedirle a Cloud Functions que genere un cobro (PaymentIntent) pasándole el UID
      const res = await fetch("/api/createPaymentIntent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: fanUid, amount: 499 }) // $4.99 en centavos
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error en el servidor de pagos");

      console.log("[2] Confirmando tarjeta en Stripe...");
      // 3. Confirmar el pago usando la tarjeta escrita por el usuario
      const confirmResult = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: tiktokUser }
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
      setError(err.message);
    }
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <h3 className="neon-text-green">¡Pago Exitoso!</h3>
        <p className="card-description">Se han añadido 10 Croins a tu cuenta de TikTok ({tiktokUser}).</p>
        <p className="card-description" style={{ marginTop: '15px' }}>¡Ve al stream de {streamerName} y escribe algo en el chat!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '20px', textAlign: 'left' }}>
      <label className="card-description" style={{ display: 'block', marginBottom: '10px' }}>Tu usuario de TikTok:</label>
      <input 
        type="text" 
        placeholder="@tu_usuario" 
        value={tiktokUser}
        onChange={(e) => setTiktokUser(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '5px', background: '#222', color: '#fff', border: '1px solid var(--neon-purple)' }}
        required
      />

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
        {processing ? `Procesando${dots}` : 'Comprar 10 Croins ($4.99)'}
      </button>
    </form>
  );
};

export default function Store() {
  const { streamerId } = useParams();
  const displayName = streamerId ? streamerId.charAt(0).toUpperCase() + streamerId.slice(1) : 'Streamer';

  return (
    <div className="store-container">
      <main className="store-main">
        <div className="panel streamer-card" style={{ maxWidth: '450px', margin: '0 auto', borderColor: 'var(--neon-green)' }}>
          <div className="avatar-placeholder" style={{ margin: '0 auto 20px auto' }}></div>
          <h2 className="neon-text-green" style={{ textAlign: 'center' }}>{displayName}</h2>
          <p className="card-description" style={{ textAlign: 'center', marginBottom: '10px' }}>Recarga saldo para que la IA lea tus mensajes en mi stream.</p>
          
          <Elements stripe={stripePromise} options={{ appearance: { theme: 'night', variables: { colorPrimary: '#9d00ff', colorBackground: '#222222' } } }}>
            <CheckoutForm streamerName={displayName} streamerId={streamerId} />
          </Elements>
        </div>
      </main>
    </div>
  );
}
