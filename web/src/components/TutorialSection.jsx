import React, { useState } from 'react';
import './TutorialSection.css';
import tutorialImg from '../assets/tutorial-dashboard.png';

/**
 * Sección de tutorial interactivo (hotspots) para el dashboard.
 * ¿POR QUÉ EXISTE?
 * - Ayuda a los usuarios a entender la interfaz del dashboard sin sacarlos de la página actual.
 * @returns {JSX.Element}
 */
const TutorialSection = () => {
  const [activeHotspot, setActiveHotspot] = useState(null);

  const hotspots = [
    { id: 1, top: '25%', left: '15%', title: 'Configuración de Regalos', desc: 'Asigna qué sonido o animación se reproduce cuando recibes un regalo específico de TikTok.' },
    { id: 2, top: '55%', left: '50%', title: 'Monitor en Vivo', desc: 'Visualiza la cola de mensajes en tiempo real y el estatus de la síntesis de voz.' },
    { id: 3, top: '22%', left: '85%', title: 'Conexión Base', desc: 'Vincula tu cuenta de TikTok con un solo clic de forma segura para iniciar la lectura.' },
    { id: 4, top: '70%', left: '85%', title: 'Configuración TTS y Efectos', desc: 'Ajusta el volumen global, activa o desactiva la censura, y gestiona los stickers dinámicos.' },
  ];

  return (
    <div id="tutorial-section" className="tutorial-container">
      <h2 className="tutorial-title">Explora tu Panel de Control</h2>
      <p className="tutorial-subtitle">Haz clic en los íconos (+) para explorar lo que puedes hacer en cada área.</p>
      
      <div className="tutorial-image-wrapper">
        <img src={tutorialImg} alt="Dashboard Tutorial" className="tutorial-img" />
        <div className="tutorial-overlay"></div>
        
        {hotspots.map(spot => (
          <div 
            key={spot.id} 
            className="hotspot"
            style={{ top: spot.top, left: spot.left }}
            onClick={() => setActiveHotspot(activeHotspot === spot.id ? null : spot.id)}
          >
            <div className={`hotspot-btn ${activeHotspot === spot.id ? 'active' : ''}`}>+</div>
            {activeHotspot === spot.id && (
              <div className="hotspot-popup">
                <h4>{spot.title}</h4>
                <p>{spot.desc}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TutorialSection;
