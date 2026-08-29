import React from 'react';
import './Creators.css';
import TutorialSection from '../components/TutorialSection';
import RevenueShareSection from '../components/RevenueShareSection';

/**
 * Página de aterrizaje para Creadores de Contenido (Streamers).
 * 
 * AUDITORÍA Y DOCUMENTACIÓN EXTREMA:
 * Este componente actúa como un embudo de conversión (funnel) diseñado para persuadir a los 
 * usuarios estándar o visitantes a convertirse en Streamers activos en la plataforma.
 * 
 * Decisiones críticas de diseño UI/UX:
 * 1. Estructura de "Hero Section": Se coloca de inmediato el valor principal ("Multiplica tus Ingresos", 
 *    "Convierte a tu audiencia en participantes activos") junto con un Call to Action (CTA) 
 *    primario destacado para la descarga directa de la aplicación de escritorio (Windows).
 * 2. Visuales Interactivos: El uso de un `dashboard-placeholder` visual y clickeable que 
 *    hace "scroll-smooth" (desplazamiento suave) hacia la sección del tutorial. Esto incita 
 *    a la exploración bajando la barrera de entrada técnica.
 * 3. Iconografía y "Feature Cards": Se resume la propuesta de valor en 3 bloques digeribles 
 *    (Ingresos, Integración, Soporte) con iconos de gran tamaño, facilitando el escaneo visual 
 *    rápido sin abrumar con texto.
 * 
 * NOTA TÉCNICA: Se asegura la modularidad importando secciones complejas (`TutorialSection`, 
 * `RevenueShareSection`) para mantener este archivo limpio y fácil de mantener.
 * No se exponen menciones a APIs de TTS externas de IA en ningún punto público, manteniendo 
 * la tecnología subyacente de síntesis de voz abstraída bajo la marca propia.
 * 
 * @returns {JSX.Element} La vista completa de la página de creadores.
 */
const CreatorsPage = () => {
  const handleScrollToTutorial = () => {
    const tutorialElement = document.getElementById('tutorial-section');
    if (tutorialElement) {
      tutorialElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="streamers-container">
      <div className="streamers-hero">
        <div className="streamers-text">
          <h1 className="streamers-title">Creador de Contenido,<br/>Ésta es tu Sección.</h1>
          <p className="streamers-subtitle">
            Convierte a tu audiencia en participantes activos. Permite que tus donadores donen y activen audios o efectos visuales, tambien deja de leer los comentarios y escuchalos directamente durante la transmision.
          </p>
          <a className="btn-streamer" href="https://us-central1-talking-crow.cloudfunctions.net/downloadApp" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
            Descargar App (Windows)
          </a>
        </div>
        
        <div className="streamers-visual" onClick={handleScrollToTutorial} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }} title="Haz clic para ver el tutorial de la interfaz">
          <div className="dashboard-placeholder">
            <div className="dash-header"></div>
            <div className="dash-body">
              <div className="dash-sidebar"></div>
              <div className="dash-main"></div>
            </div>
          </div>
          <p style={{ marginTop: '20px', color: 'var(--neon-green)', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', textShadow: '0 0 10px rgba(57, 255, 20, 0.5)' }}>
            Explora tu Panel de Control
          </p>
        </div>
      </div>

      <div className="streamers-features">
        <div className="s-feature-card">
          <div className="s-feature-icon">💎</div>
          <h3>Multiplica tus Ingresos</h3>
          <p>Aumenta tus donaciones personalizando regalos en audios o stikers y recibe comisiones por el uso de voces clonadas de tu comunidad.</p>
        </div>
        <div className="s-feature-card">
          <div className="s-feature-icon">🔌</div>
          <h3>Integración Rápida y Limpia</h3>
          <p>Un par de clicks y estarás listo para utilizar nuestra app de manera nativa sin complicadas configuraciones en OBS.</p>
        </div>
        <div className="s-feature-card">
          <div className="s-feature-icon">🛠️</div>
          <h3>Soporte Técnico</h3>
          <p>No dudes en contactarnos para reportar bugs o recomendarnos cómo mejorar nuestra aplicación de forma continua.</p>
        </div>
      </div>

      <TutorialSection />
      <RevenueShareSection />
    </div>
  );
};

export default CreatorsPage;

