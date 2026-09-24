import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export default function CouponRedeemer() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function redeem(event) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      const { data } = await httpsCallable(functions, 'redeemCoupon')({ code });
      setNotice(`Recibiste ${data.amount} ${data.currency === 'credits' ? 'créditos para TTS normal' : 'Croins promocionales para voces Eco'}.`);
      setCode('');
    } catch (error) {
      setNotice(error.message || 'No se pudo canjear el cupón.');
    } finally { setBusy(false); }
  }
  return <section style={{ margin: '20px 0', padding: 20, border: '1px solid var(--neon-purple)', borderRadius: 8 }}>
    <h3>Canjear cupón</h3>
    <p>Los cupones de créditos sirven para TTS normal; los de Croins, para voces Eco.</p>
    <form onSubmit={redeem} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <label>Código del cupón <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={64} required disabled={busy} /></label>
      <button className="btn-neon" disabled={busy || !code.trim()}>{busy ? 'Canjeando…' : 'Canjear'}</button>
    </form>
    <p role="status">{notice}</p>
  </section>;
}
