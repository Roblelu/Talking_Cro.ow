import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SupportPage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      alert("Por favor, llena ambos campos antes de enviar.");
      return;
    }

    if (!currentUser) {
      alert("Debes iniciar sesión para enviar un mensaje de soporte.");
      return;
    }

    setIsSubmitting(true);
    setSuccess(false);

    try {
      await addDoc(collection(db, 'support_tickets'), {
        uid: currentUser.uid,
        email: currentUser.email || userData?.email || 'Desconocido',
        username: userData?.username || 'Usuario',
        subject: subject.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
        status: 'unread'
      });
      
      setSubject('');
      setMessage('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error("Error enviando ticket de soporte:", error);
      alert("Hubo un error al enviar el mensaje: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '700px' }}>
      <button 
        className="btn-neon back-btn-responsive" 
        onClick={() => navigate('/dashboard')} 
      >
        &lt; Volver al Dashboard
      </button>

      <div className="panel" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 className="neon-text-green" style={{ margin: 0 }}>Soporte Técnico</h2>
        </div>
      
      <div style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          ¿Tienes problemas o sugerencias desde el más allá? Contáctanos.
        </p>
        
        {success && (
          <div style={{ padding: '10px', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid var(--neon-green)', color: 'var(--neon-green)', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
            Mensaje Enviado Correctamente, lo tendremos en cuenta pero considera que no te contactaremos de vuelta.
          </div>
        )}

        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Asunto</label>
        <input 
          type="text" 
          placeholder="Ej. F5-TTS no clona mi voz..." 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSubmitting}
        />
        
        <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Mensaje</label>
        <textarea 
          placeholder="Describe el problema en detalle..." 
          rows="6"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting}
        ></textarea>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button 
            className="btn-neon" 
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.5 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
        </div>
      </div>
      </div>
      <div></div>
    </div>
  );
};

export default SupportPage;
