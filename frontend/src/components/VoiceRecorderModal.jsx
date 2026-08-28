import React, { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import WebAudioPlayer from './WebAudioPlayer';
import NeonSelect from './NeonSelect';

/**
 * @component VoiceRecorderModal
 * @description Interfaz modal para grabar, previsualizar y subir la muestra de voz del usuario.
 * Utiliza MediaRecorder para capturar el audio localmente y se comunica con Firebase Functions 
 * (`createEcoVoice`) para procesar y crear el modelo de EcoVoice.
 * 
 * @economy Se llama a `createEcoVoice` (Firebase Function), lo cual genera costos de invocación y ancho de banda. 
 * Probablemente el backend de esta función llame a APIs externas de clonación de voz (ej. ElevenLabs) que tienen costo por uso.
 * 
 * @risk Riesgo de privacidad: El audio del usuario y la clonación generada deben ser manejados con consentimiento (cumplimiento legal/GDPR).
 * @risk Calidad de audio: Si el usuario usa un mal micrófono o un entorno ruidoso, la voz clonada será deficiente.
 */
const VoiceRecorderModal = ({ isOpen, onClose, onSuccess }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [inputDevices, setInputDevices] = useState([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState('default');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setInputDevices(audioInputs);
      } catch (err) {
        console.error("Error enumerating input devices:", err);
      }
    };
    fetchDevices();
    navigator.mediaDevices.ondevicechange = fetchDevices;
  }, []);

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
      const audioConstraint = selectedInputDevice !== 'default' 
          ? { deviceId: { exact: selectedInputDevice } } 
          : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/mp4' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioURL(audioUrl);
        setAudioBlob(audioBlob);
        audioChunksRef.current = [];
      };

      setAudioURL(null);
      setAudioBlob(null);
      setTimer(0);
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("No se pudo acceder al micrófono. Por favor revisa los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Detener todos los tracks para apagar el ícono del micrófono en la pestaña
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
        reader.onerror = () => reject(new Error('No se pudo leer la grabación.'));
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(audioBlob);
      });
      const base64data = dataUrl.split(',')[1];
      const mimeType = audioBlob.type || 'audio/webm';
      const createEcoVoice = httpsCallable(functions, 'createEcoVoice');
      const result = await createEcoVoice({
        base64Audio: base64data,
        fileName: 'voice_sample.webm',
        mimeType
      });

      if (result.data.success) {
        alert('¡Tu EcoVoice se ha creado con éxito!');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error al subir:", error);
      alert("Ocurrió un error al crear la voz: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '15px',
        width: '500px', border: '1px solid rgba(157, 0, 255, 0.4)',
        boxShadow: '0 0 20px rgba(157, 0, 255, 0.2)'
      }}>
        <h2 style={{ color: 'var(--neon-purple)', marginTop: 0 }}>Graba tu EcoVoice</h2>
        
        <p style={{ color: 'var(--text-secondary)' }}>
          Para lograr una clonación perfecta, presiona "Grabar" y lee el siguiente texto en voz alta y clara. Intenta que dure al menos 20 segundos.
        </p>

        <div style={{
          backgroundColor: 'rgba(0,0,0,0.4)', padding: '15px', borderRadius: '8px',
          borderLeft: '4px solid var(--neon-green)', margin: '20px 0',
          fontStyle: 'italic', color: '#ddd'
        }}>
          "El cuervo, con su plumaje negro y brillante, es una de las aves más inteligentes que existen. Se dice que pueden recordar rostros, usar herramientas y hasta imitar sonidos humanos. Observarlos volar nos recuerda que la naturaleza esconde secretos fascinantes. Al igual que el cuervo imita los sonidos de su entorno, con esta grabación mi propia voz formará parte de la parvada."
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '5px', fontSize: '0.85rem' }}>Micrófono de entrada</label>
          <NeonSelect 
            options={[
              { value: 'default', label: 'Por Defecto del Sistema' },
              ...inputDevices.map(device => ({ value: device.deviceId, label: device.label || `Micrófono ${device.deviceId}` }))
            ]}
            value={selectedInputDevice} 
            onChange={(val) => setSelectedInputDevice(val)}
            disabled={isRecording}
            color="purple"
          />
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
