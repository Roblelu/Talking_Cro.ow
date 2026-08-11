import React, { useState } from 'react';
import './OnlineCreatorsPage.css';

const OnlineCreatorsPage = () => {
  const [sortOption, setSortOption] = useState('online'); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filterOptions = [
    { value: 'online', label: 'Online' },
    { value: 'alphabetical', label: 'Alfabetico (A-Z)' },
    { value: 'alphabetical-desc', label: 'Alfabetico (Z-A)' },
    { value: 'seniority', label: 'Antiguedad' }
  ];

  // Actualmente sin datos hardcodeados. Cuando haya base de datos, se llenará aquí.
  const mockCreators = [];

  const sortedCreators = [...mockCreators].sort((a, b) => {
    if (sortOption === 'online') {
      if (a.isOnline === b.isOnline) {
        return a.name.localeCompare(b.name);
      }
      return a.isOnline ? -1 : 1;
    } else if (sortOption === 'alphabetical') {
      return a.name.localeCompare(b.name);
    } else if (sortOption === 'alphabetical-desc') {
      return b.name.localeCompare(a.name);
    } else if (sortOption === 'seniority') {
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    }
    return 0;
  });

  return (
    <div className="online-page-container">
      <div className="online-hero">
        <h1 className="online-page-title">Bienvenidos My Little Crow</h1>
        <p className="online-page-subtitle">Descubre a los creadores de contenido que estan en linea que cuentan con el sistema Talking Cro.ow con quienes puedes reproducir tu voz clonada!!!</p>
        
        <div className="filter-container">
          <label className="filter-label">Ordenar por:</label>
          <div className="custom-select-wrapper" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="custom-select-display">
              {filterOptions.find(opt => opt.value === sortOption)?.label}
              <span className={`custom-select-arrow ${isDropdownOpen ? 'open' : ''}`}>▶</span>
            </div>
            {isDropdownOpen && (
              <div className="custom-select-options">
                {filterOptions.map(opt => (
                  <div 
                    key={opt.value} 
                    className={`custom-select-option ${sortOption === opt.value ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortOption(opt.value);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="creators-grid">
        {sortedCreators.length > 0 ? (
          sortedCreators.map(creator => (
            <div key={creator.id} className={`creator-card ${creator.isOnline ? 'card-online' : 'card-offline'}`}>
              <div className="creator-avatar-container">
                <img src={creator.avatar} alt={creator.name} className="creator-avatar-img" />
                {creator.isOnline && <div className="status-badge online"></div>}
                {!creator.isOnline && <div className="status-badge offline"></div>}
              </div>
              <div className="creator-info">
                <h4 className="creator-name">{creator.name}</h4>
                <span className="creator-username">{creator.username}</span>
              </div>
              <button 
                className={`btn-connect ${creator.isOnline ? 'active-stream' : 'offline-stream'}`}
                onClick={() => creator.isOnline && window.open(`https://www.tiktok.com/${creator.username}`, '_blank')}
              >
                {creator.isOnline ? 'IR AL DIRECTO' : 'OFFLINE'}
              </button>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', width: '100%', gridColumn: '1 / -1', padding: '50px', color: '#a0aec0' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>No hay creadores disponibles en este momento.</h3>
            <p>Vuelve más tarde para interactuar con tus streamers favoritos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineCreatorsPage;
