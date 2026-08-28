import React, { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import fixWebmDuration from 'fix-webm-duration';
import WebAudioPlayer from './WebAudioPlayer';

/**
 * Modal para grabar el sample de voz (EcoVoice) usando MediaRecorder API.
 * ¿POR QUÉ EXISTE?
 * - Permite capturar la voz del creador en el formato adecuado (webm/mp4).
 * - Sube el archivo capturado convirtiéndolo a Base64 e invoca la Cloud Function `createEcoVoice`.
 * 
 * ECONOMÍA Y COSTOS ASOCIADOS:
 * - Invoca la Cloud Function `createEcoVoice` (costo de invocación de función + cómputo).
 * - Transferencia de red saliente si el audio es grande.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen Controla la visibilidad del modal.
 * @param {Function} props.onClose Callback al cerrar.
 * @param {Function} props.onSuccess Callback al subir la voz con éxito.
 * @returns {JSX.Element|null}
 */
const VoiceRecorderModal = ({ isOpen, onClose, onSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/mp4' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = {}; // Deja que el navegador elija su formato predeterminado
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/mp4';
        const rawBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const duration = Date.now() - startTimeRef.current;

        if (mimeType.includes('webm')) {
            fixWebmDuration(rawBlob, duration, (fixedBlob) => {
                const audioUrl = URL.createObjectURL(fixedBlob);
                setAudioURL(audioUrl);
                setAudioBlob(fixedBlob);
                audioChunksRef.current = [];
            });
        } else {
            const audioUrl = URL.createObjectURL(rawBlob);
            setAudioURL(audioUrl);
            setAudioBlob(rawBlob);
            audioChunksRef.current = [];
        }
      };

      setAudioURL(null);
      setAudioBlob(null);
      setTimer(0);
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error al acceder al micrófono: ", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos de tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    
    if (timer < 15) {
        if(!window.confirm("El audio es muy corto (menos de 15 segundos). La calidad de tu voz clonada podría no ser óptima. ¿Deseas enviarlo de todos modos?")) {
            return;
        }
    }

    setIsUploading(true);
    try {
      if (audioBlob.size > 10 * 1024 * 1024) {
        throw new Error('La grabación supera el límite de 10 MB.');
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(audioBlob);
      });
      const base64Data = dataUrl.split(',')[1];
      const createEcoVoice = httpsCallable(functions, 'createEcoVoice');
      const result = await createEcoVoice({
        base64Audio: base64Data,
        fileName: 'voice_sample',
        mimeType: audioBlob.type || 'audio/mp4'
      });
      
      if (result.data.success) {
        onSuccess && onSuccess(result.data.voice_id);
      } else {
        throw new Error("Error desconocido al crear la voz.");
      }
    } catch (error) {
      console.error("Error al procesar la subida:", error);
      alert("Hubo un problema al subir tu audio: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="modal-content" style={{
        backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '15px',
        width: '500px', border: '1px solid var(--neon-purple)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(157, 0, 255, 0.2)'
      }}>
        <h2 className="modal-title neon-text-purple" style={{ color: 'var(--neon-purple)', marginTop: 0, marginBottom: '10px' }}>Graba tu EcoVoice</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Para lograr una clonación perfecta, presiona "Grabar" y lee el siguiente texto en voz alta y clara. Intenta que dure al menos 20 segundos.
        </p>

        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', borderLeft: '4px solid var(--neon-green)', marginBottom: '20px', fontStyle: 'italic', color: '#e0e0e0', lineHeight: '1.6' }}>
          "El cuervo, con su plumaje negro y brillante, es una de las aves más inteligentes que existen. Se dice que pueden recordar rostros, usar herramientas y hasta imitar sonidos humanos. Observarlos volar nos recuerda que la naturaleza esconde secretos fascinantes. Al igual que el cuervo imita los sonidos de su entorno, con esta grabación mi propia voz formará parte de la parvada."
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: isRecording ? '#ff003c' : 'var(--neon-green)' }}>
            {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
            {isRecording && <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', marginLeft: '10px' }}>🔴</span>}
          </div>
          
          <div>
            {!isRecording && !audioURL && (
              <button className="btn-neon" onClick={startRecording}>
                🎤 Iniciar Grabación
              </button>
            )}
            
            {isRecording && (
              <button className="btn-neon" style={{ borderColor: '#ff003c', color: '#ff003c' }} onClick={stopRecording}>
                ⏹ Detener
              </button>
            )}
            
            {!isRecording && audioURL && (
              <button className="btn-neon btn-neon-orange" onClick={startRecording}>
                🔄 Grabar de nuevo
              </button>
            )}
          </div>
        </div>

        {audioURL && (
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Escucha tu grabación antes de enviarla:</p>
            <WebAudioPlayer blob={audioBlob} style={{ width: '100%', justifyContent: 'center' }} />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '30px' }}>
          <button className="btn-neon" style={{ borderColor: '#999', color: '#999' }} onClick={onClose} disabled={isUploading}>
            Cancelar
          </button>
          <button 
            className="btn-neon btn-neon-green" 
            onClick={handleUpload} 
            disabled={!audioURL || isUploading}
          >
            {isUploading ? 'Creando EcoVoice...' : 'Subir y Crear Voz'}
          </button>
        </div>

        <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(255, 0, 60, 0.05)', border: '1px dashed rgba(255, 0, 60, 0.3)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#ff8888', textAlign: 'justify', lineHeight: '1.4' }}>
            ⚠️ <strong>Aviso de Privacidad y Consentimiento:</strong> Al subir este audio, confirmas y aceptas que esta voz es tuya y no de una tercera persona, y otorgas permiso para su uso exclusivo dentro del sistema de Talking Cro.ow. Nos comprometemos a que tu voz no será compartida, distribuida, ni utilizada para clonarse en ninguna otra plataforma externa.
            </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorderModal;
