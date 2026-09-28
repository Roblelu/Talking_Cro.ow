import React from 'react';

function SessionSummaryModal({ session, onClose }) {
  if (!session) return null;

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        className="glass-panel"
        style={{ 
          padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
          border: '2px solid var(--accent-purple)', borderRadius: '15px', boxShadow: '0 0 30px rgba(162, 59, 255, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="neon-text-purple" style={{ textAlign: 'center', marginTop: 0 }}>AResumen de la SesiA3n!</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>Tu conexiA3n ha finalizado. AquA- estAn tus estadA-sticas.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tiempo Conectado</span>
            <div style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>{formatDuration(session.duration_seconds)}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pico de Audiencia</span>
            <div style={{ fontSize: '1.2rem', color: 'var(--accent-purple)' }}>{session.peak_viewers}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chatters Anicos</span>
            <div style={{ fontSize: '1.2rem', color: 'white' }}>{session.unique_chatters}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mensajes Atajados (IA)</span>
            <div style={{ fontSize: '1.2rem', color: '#ff003c' }}>{session.censored_messages}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mensajes TTS Base</span>
            <div style={{ fontSize: '1.2rem', color: 'white' }}>{session.tts_normal}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mensajes Eco Voice</span>
            <div style={{ fontSize: '1.2rem', color: '#00ffcc' }}>{session.tts_eco || 0}</div>
          </div>
        </div>

        <h3 style={{ color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Los MVP de la SesiA3n</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Top Chatter</div>
            <div style={{ fontSize: '1.1rem' }}>@{session.top_chatter}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>{session.top_chatter_count} mensajes</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Mayor Apoyo (Donador)</div>
            <div style={{ fontSize: '1.1rem' }}>@{session.top_gifter}</div>
            <div style={{ fontSize: '0.8rem', color: '#ffaa00' }}>{session.top_gifter_val} valor aportado</div>
          </div>
        </div>

        {session.gifts && session.gifts.length > 0 && (
          <>
            <h3 style={{ color: 'var(--accent-purple)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>Regalos Recibidos</h3>
            <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }} className="custom-scrollbar">
              {session.gifts.map((g, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div><strong style={{ color: 'white' }}>@{g.username}</strong> enviA3 {g.gift_name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Minuto {g.time_str}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn-neon btn-neon-purple" style={{ width: '100%', marginTop: '20px' }} onClick={onClose}>Excelente, cerrar</button>
      </div>
    </div>
  );
}

export default SessionSummaryModal;
