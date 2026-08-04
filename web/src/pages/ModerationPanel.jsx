import React, { useState, useEffect } from 'react';
import '../App.css'; // Mantenemos el estilo global

/**
 * ModerationPanel Component
 * Este componente actúa como el "Muro de Donadores".
 * Se encarga de consultar constantemente al servidor local de Python
 * para obtener los mensajes VIP pendientes y permitir al streamer 
 * aprobarlos (enviarlos a la IA de voz) o rechazarlos.
 */
function ModerationPanel() {
  // Estado para almacenar la lista de mensajes pendientes.
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({ "Authorization": `Bearer ${localStorage.getItem("local_api_key") || ""}` });

  /**
   * fetchQueue
   * Consulta al endpoint de Python que devuelve los mensajes encolados.
   */
  const fetchQueue = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8763/api/moderation/queue', { headers: getHeaders() });
      const data = await response.json();
      
      // Actualizamos la lista de mensajes en la interfaz
      if (data.items) {
        setPendingMessages(data.items);
      }
    } catch (error) {
      console.error("[ModerationPanel] Error al conectar con el servidor local:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * useEffect 
   * Configura un "Polling" (bucle de consulta) que se ejecuta cada 3 segundos
   * para traer los nuevos comentarios en vivo.
   */
  useEffect(() => {
    // 1. Consulta inmediata al cargar la página
    fetchQueue();
    
    // 2. Establecer un ciclo continuo cada 3000 ms (3 segundos)
    const intervalId = setInterval(fetchQueue, 3000);
    
    // 3. Limpiar el ciclo si el streamer cierra la ventana
    return () => clearInterval(intervalId);
  }, []);

  /**
   * handleApprove
   * Envía la instrucción de APROBADO al backend para que inicie la síntesis de voz (F5-TTS).
   * @param {string} token - El ID único del mensaje.
   */
  const handleApprove = async (token) => {
    try {
      await fetch(`http://127.0.0.1:8763/api/moderation/approve/${token}`, { 
        method: 'POST',
        headers: getHeaders()
      });
      // Tras aprobar, forzamos una recarga inmediata de la cola para borrarlo visualmente
      fetchQueue();
    } catch (error) {
      console.error("[ModerationPanel] Error al aprobar:", error);
    }
  };

  /**
   * handleReject
   * Envía la instrucción de RECHAZADO al backend. Se ignora y no se genera voz.
   * @param {string} token - El ID único del mensaje.
   */
  const handleReject = async (token) => {
    try {
      await fetch(`http://127.0.0.1:8763/api/moderation/reject/${token}`, { 
        method: 'POST',
        headers: getHeaders()
      });
      // Tras rechazar, recargamos la lista
      fetchQueue();
    } catch (error) {
      console.error("[ModerationPanel] Error al rechazar:", error);
    }
  };

  return (
    <div className="store-container">
      {/* Contenedor central estilo Neón Spooky */}
      <div className="store-card" style={{ maxWidth: '800px', width: '90%' }}>
        
        <h1 style={{ color: 'var(--neon-green)', textAlign: 'center', marginBottom: '10px' }}>
          Muro de Donadores
        </h1>
        <p className="card-description" style={{ textAlign: 'center', marginBottom: '30px' }}>
          Aprueba los mensajes pagados para que la IA los hable en el Stream.
        </p>

        {/* Estado de carga */}
        {loading && <p style={{ textAlign: 'center', color: '#fff' }}>Conectando con el servidor...</p>}

        {/* Mensaje cuando la cola está vacía */}
        {!loading && pendingMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-gray)', padding: '30px' }}>
            No hay mensajes VIP pendientes en este momento.
          </div>
        )}

        {/* Lista de mensajes pendientes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {pendingMessages.map((msg) => (
            <div 
              key={msg.id} 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--neon-purple)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 0 10px rgba(188, 19, 254, 0.2)'
              }}
            >
              {/* Bloque de Información del Comentario */}
              <div style={{ flex: 1, marginRight: '20px' }}>
                <h3 style={{ color: 'var(--neon-purple)', margin: '0 0 5px 0' }}>
                  {msg.username}
                </h3>
                <p style={{ color: '#fff', margin: 0, fontSize: '16px' }}>
                  "{msg.comment}"
                </p>
              </div>

              {/* Botones de Control */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleReject(msg.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid #ff4444',
                    color: '#ff4444',
                    padding: '8px 15px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { e.target.style.backgroundColor = 'rgba(255,68,68,0.1)'; }}
                  onMouseOut={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                >
                  Rechazar
                </button>

                <button 
                  onClick={() => handleApprove(msg.id)}
                  style={{
                    backgroundColor: 'var(--neon-green)',
                    border: 'none',
                    color: '#000',
                    padding: '8px 20px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px var(--neon-green)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { e.target.style.transform = 'scale(1.05)'; }}
                  onMouseOut={(e) => { e.target.style.transform = 'scale(1)'; }}
                >
                  Hablar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ModerationPanel;
