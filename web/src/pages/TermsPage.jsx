import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="panel-layout-wrapper" style={{ '--panel-width': '800px' }}>
      <button 
        className="btn-neon back-btn-responsive" 
        onClick={() => navigate('/dashboard')} 
      >
        &lt; Volver al Dashboard
      </button>

      <div style={{ width: '100%', padding: '20px', background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid rgba(157, 0, 255, 0.4)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 className="neon-text-purple" style={{ margin: 0 }}>Términos y Condiciones</h2>
        </div>

      <div style={{ color: 'var(--text-primary)', lineHeight: '1.6', fontSize: '0.95rem' }}>
        <p>Bienvenido a <strong>Talking Cro.ow</strong>. Al utilizar nuestra plataforma para el envío de donaciones mediante síntesis de voz impulsada por Inteligencia Artificial, aceptas los siguientes términos de servicio. Nuestro objetivo es crear una comunidad divertida, segura y libre de abusos.</p>
        
        <div style={{ background: 'rgba(255,0,60,0.1)', borderLeft: '4px solid var(--neon-red)', padding: '15px', margin: '20px 0', borderRadius: '0 8px 8px 0' }}>
          <strong>IMPORTANTE:</strong> Estos términos están diseñados para proteger tanto al Creador de Contenido (Streamer) como a la Comunidad de usuarios. El incumplimiento de estas normas resultará en el rechazo de la donación (sin reembolso) y el baneo permanente de la plataforma.
        </div>

        <h3 className="neon-text-orange" style={{ marginTop: '30px', marginBottom: '15px' }}>1. Consentimiento de Clonación de Voz</h3>
        <p>Al subir un archivo de audio o grabar tu voz a través de nuestra plataforma, <strong>garantizas bajo pena de perjurio que la voz proporcionada te pertenece única y exclusivamente a ti</strong>.</p>
        <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
          <li style={{ marginBottom: '10px' }}>Está <strong>estrictamente prohibido</strong> subir voces de celebridades, figuras públicas, políticos, personajes con derechos de autor, o de cualquier tercera persona sin su consentimiento explícito y demostrable.</li>
          <li style={{ marginBottom: '10px' }}>Cedes a Talking Cro.ow el derecho temporal de procesar tu voz con el único fin de generar la síntesis para el mensaje de tu donación.</li>
          <li style={{ marginBottom: '10px' }}><strong>Privacidad y Datos Efímeros:</strong> Tu huella vocal se utilizará mediante un modelo efímero (Instant Voice Cloning). La huella biométrica digital generada en la nube es destruida inmediatamente después de sintetizar el mensaje. Mantenemos el archivo de audio original en servidores locales por un máximo de 3 meses por motivos de seguridad, auditoría y resolución de disputas de pago.</li>
        </ul>

        <h3 className="neon-text-orange" style={{ marginTop: '30px', marginBottom: '15px' }}>2. Política de Uso Prohibido y Moderación</h3>
        <p>Todo mensaje enviado a través de Talking Cro.ow está sujeto a moderación humana antes de ser emitido en el Stream.</p>
        <p>Te comprometes a <strong>NO</strong> usar nuestra tecnología de IA para generar:</p>
        <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
          <li style={{ marginBottom: '10px' }}><strong>Contenido Ilegal o Dañino:</strong> Fraudes, extorsiones, deepfakes engañosos, o contenido que promueva actividades ilícitas.</li>
          <li style={{ marginBottom: '10px' }}><strong>Discursos de Odio y Acoso:</strong> Insultos raciales, amenazas, doxing, bullying, o ataques personales hacia el Streamer, los moderadores u otros miembros del chat.</li>
          <li style={{ marginBottom: '10px' }}><strong>Contenido para Adultos o Explotación:</strong> Lenguaje sexualmente explícito, violencia gráfica, o cualquier material que atente contra la seguridad infantil.</li>
        </ol>

        <div style={{ background: 'rgba(255,117,24,0.1)', borderLeft: '4px solid var(--neon-orange)', padding: '15px', margin: '20px 0', borderRadius: '0 8px 8px 0' }}>
          <strong>ADVERTENCIA:</strong> Todo contenido pasa por una cola de moderación. El Streamer se reserva el derecho exclusivo de aprobar o rechazar tu mensaje. Si tu mensaje es rechazado por violar esta Política de Uso Prohibido, <strong>los fondos de la donación no serán reembolsados</strong> y tu cuenta será bloqueada.
        </div>

        <h3 className="neon-text-orange" style={{ marginTop: '30px', marginBottom: '15px' }}>3. Descargo de Responsabilidad (Disclaimer)</h3>
        <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
          <li style={{ marginBottom: '10px' }}>El Creador de Contenido no se hace responsable de las opiniones expresadas a través de la IA de Talking Cro.ow, ya que el contenido es originado por terceros (donadores).</li>
          <li style={{ marginBottom: '10px' }}>La tecnología de texto a voz (TTS) y clonación es proporcionada "tal cual" y puede estar sujeta a mantenimientos o fallas de red de proveedores externos (nube).</li>
          <li style={{ marginBottom: '10px' }}>Al aceptar estos términos, liberas a Talking Cro.ow y a sus operadores de cualquier responsabilidad legal derivada del mal uso que puedas darle a la plataforma.</li>
        </ul>

        <h3 className="neon-text-orange" style={{ marginTop: '30px', marginBottom: '15px' }}>4. Cambios a los Términos</h3>
        <p style={{ marginBottom: '30px' }}>Nos reservamos el derecho de modificar o actualizar estos Términos de Servicio en cualquier momento para adaptarnos a las normativas vigentes. Tu uso continuo de la plataforma constituye la aceptación de dichas modificaciones.</p>
        
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '30px 0' }} />
        <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', textAlign: 'center' }}>Al hacer clic en "Acepto" y proceder al pago de tu suscripción o donación, confirmas que has leído y entendido esta política de uso responsable de nuestro sistema.</p>
      </div>
      </div>
      <div></div>
    </div>
  );
};

export default TermsPage;
