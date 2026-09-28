import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';

function SessionHistoryPage({ currentUser }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const fetchSessions = async () => {
      try {
        const q = query(
          collection(db, 'users', currentUser.uid, 'sessions'),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSessions(data);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
      setLoading(false);
    };
    fetchSessions();
  }, [currentUser]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Desconocida';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)', maxWidth: '900px', margin: '0 auto' }}>
      <h2 className="neon-text-purple" style={{ textAlign: 'center', marginBottom: '30px' }}>Historial de Sesiones</h2>
      
      {loading ? (
        <p style={{ textAlign: 'center' }}>Cargando...</p>
      ) : sessions.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay sesiones registradas aAAn.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {sessions.map(session => (
            <div 
              key={session.id} 
              className="glass-panel" 
              style={{ padding: '15px', cursor: 'pointer', border: '1px solid var(--accent-purple)', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.02)' } }}
              onClick={() => setSelectedSession(session)}
            >
              <h3 style={{ color: 'var(--accent-cyan)', margin: '0 0 10px 0', fontSize: '1.2rem' }}>{formatDate(session.timestamp)}</h3>
              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>DuraciA3n: <strong style={{ color: 'white' }}>{formatDuration(session.duration_seconds)}</strong></p>
              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>Chatters: <strong style={{ color: 'white' }}>{session.unique_chatters}</strong></p>
              <p style={{ margin: '5px 0', fontSize: '0.9rem' }}>Top Chatter: <strong style={{ color: 'white' }}>@{session.top_chatter}</strong></p>
            </div>
          ))}
        </div>
      )}

      {selectedSession && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div 
            className="glass-panel"
            style={{ 
              padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
              border: '2px solid var(--accent-purple)', borderRadius: '15px', boxShadow: '0 0 30px rgba(162, 59, 255, 0.4)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="neon-text-purple" style={{ textAlign: 'center', marginTop: 0 }}>Resumen de SesiA3n</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>{formatDate(selectedSession.timestamp)}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tiempo Conectado</span>
                <div style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>{formatDuration(selectedSession.duration_seconds)}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pico de Audiencia</span>
                <div style={{ fontSize: '1.2rem', color: 'var(--accent-purple)' }}>{selectedSession.peak_viewers}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chatters Anicos</span>
                <div style={{ fontSize: '1.2rem', color: 'white' }}>{selectedSession.unique_chatters}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mensajes Atajados (IA)</span>
                <div style={{ fontSize: '1.2rem', color: '#ff003c' }}>{selectedSession.censored_messages}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mensajes TTS Base</span>
                <div style={{ fontSize: '1.2rem', color: 'white' }}>{selectedSession.tts_normal}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mensajes Eco Voice</span>
                <div style={{ fontSize: '1.2rem', color: '#00ffcc' }}>{selectedSession.tts_eco || 0}</div>
              </div>
            </div>

            <h3 style={{ color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Los MVP de la SesiA3n</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Top Chatter</div>
                <div style={{ fontSize: '1.1rem' }}>@{selectedSession.top_chatter}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>{selectedSession.top_chatter_count} mensajes</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Mayor Apoyo (Donador)</div>
                <div style={{ fontSize: '1.1rem' }}>@{selectedSession.top_gifter}</div>
                <div style={{ fontSize: '0.8rem', color: '#ffaa00' }}>{selectedSession.top_gifter_val} valor aportado</div>
              </div>
            </div>

            {selectedSession.gifts && selectedSession.gifts.length > 0 && (
              <>
                <h3 style={{ color: 'var(--accent-purple)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Regalos Recibidos</h3>
                <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
                  {selectedSession.gifts.map((g, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div><strong style={{ color: 'white' }}>@{g.username}</strong> enviA3 {g.gift_name}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Minuto {g.time_str}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button className="btn-neon btn-neon-purple" style={{ width: '100%', marginTop: '20px' }} onClick={() => setSelectedSession(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionHistoryPage;
