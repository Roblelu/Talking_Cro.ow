import React, { useState, useRef, useEffect } from 'react';

/**
 * Reproductor de audio personalizado utilizando la Web Audio API.
 * ¿POR QUÉ EXISTE?
 * - Para reproducir blobs de audio locales o URLs sin depender del elemento <audio> nativo,
 *   permitiendo mayor control (aunque aquí se usa para reproducción simple).
 * @param {Object} props
 * @param {string} [props.src] URL del audio.
 * @param {Blob} [props.blob] Blob del audio local.
 * @param {Object} [props.style] Estilos adicionales.
 * @returns {JSX.Element}
 */
const WebAudioPlayer = ({ src, blob, style }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const audioBufferRef = useRef(null);

  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const loadAudio = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let arrayBuffer;
      if (blob) {
        arrayBuffer = await blob.arrayBuffer();
      } else if (src) {
        const response = await fetch(src);
        if (!response.ok) throw new Error("Error fetching audio");
        arrayBuffer = await response.arrayBuffer();
      } else {
        throw new Error("No source provided");
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      return audioBuffer;
    } catch (err) {
      console.error("Error loading audio:", err);
      setError("Error al cargar el audio.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = async () => {
    if (isPlaying) {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch(e) {}
      }
      setIsPlaying(false);
      return;
    }

    if (!audioBufferRef.current) {
      const loaded = await loadAudio();
      if (!loaded) return;
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      setIsPlaying(false);
    };

    source.start();
    sourceNodeRef.current = source;
    setIsPlaying(true);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', ...style }}>
      <button 
        onClick={togglePlay}
        disabled={isLoading}
        style={{
          background: isPlaying ? 'rgba(255, 0, 60, 0.2)' : 'rgba(0, 255, 204, 0.2)',
          border: `1px solid ${isPlaying ? '#ff003c' : 'var(--neon-green)'}`,
          color: isPlaying ? '#ff003c' : 'var(--neon-green)',
          padding: '8px 15px',
          borderRadius: '20px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'all 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          justifyContent: 'center'
        }}
      >
        {isLoading ? '⏳ Cargando...' : isPlaying ? '⏹ Detener Grabación' : '▶ Escuchar Grabación'}
      </button>
      {error && <span style={{ color: '#ff003c', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
};

export default WebAudioPlayer;
