import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '1000px' }}>
      <button 
        className="btn-neon back-btn-responsive" 
        onClick={() => navigate('/dashboard')} 
      >
        &lt; Volver al Dashboard
      </button>

      <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 className="neon-text-green" style={{ margin: 0 }}>Paquetes de Croins</h2>
        </div>
      
      <div style={{ padding: '20px' }}>
        {/* Paquetes */}
        <h1 className="neon-text-green" style={{ fontSize: '2.5rem', marginBottom: '10px', marginTop: '0' }}>Tienda y Suscripciones</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Adquiere Croins para usar tu voz clonada y se lea en vivo con los streamers afiliados.</p>
        
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

        {/* Historial de Pagos */}
        <h3 className="neon-text-purple" style={{ marginBottom: '15px' }}>Historial de Pagos</h3>
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(157, 0, 255, 0.2)', overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Fecha</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Descripción</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Monto</th>
                <th style={{ padding: '10px', color: 'var(--text-secondary)' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay pagos recientes.</td>
                </tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }}>{tx.date?.toDate().toLocaleDateString() || '...'}</td>
                    <td style={{ padding: '10px' }}>{tx.description}</td>
                    <td style={{ padding: '10px', color: 'var(--neon-green)' }}>${tx.amount?.toFixed(2)} {tx.currency?.toUpperCase()}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.85rem',
                        background: tx.status === 'succeeded' ? 'rgba(0,255,204,0.1)' : 'rgba(255,117,24,0.1)',
                        color: tx.status === 'succeeded' ? 'var(--neon-green)' : 'var(--neon-orange)'
                      }}>
                        {tx.status === 'succeeded' ? 'Aprobado' : tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      <div></div>
    </div>
  );
};

export default SubscriptionPage;
