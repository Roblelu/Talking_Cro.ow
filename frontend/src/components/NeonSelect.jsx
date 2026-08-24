import React, { useState, useRef, useEffect } from 'react';

const NeonSelect = ({ options, value, onChange, disabled = false, color = 'purple', placeholder = 'Seleccionar...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={containerRef} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', width: '100%', marginBottom: '15px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <button
          className={`btn-neon btn-neon-${color}`}
          style={{
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 15px',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={`accordion-arrow ${isOpen ? 'open' : ''}`} style={{ fontSize: '0.8rem', marginRight: '10px', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>▶</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', flex: 1, color: '#ffffff' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </button>

        {isOpen && !disabled && (
          <div style={{
            position: 'relative',
            marginTop: '5px',
            backgroundColor: '#1a1a1a',
            border: `1px solid var(--neon-${color})`,
            borderRadius: '8px',
            boxShadow: `0 0 15px rgba(${color === 'purple' ? '157, 0, 255' : '0, 255, 204'}, 0.2)`,
            zIndex: 100,
            maxHeight: '200px',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '5px',
            boxSizing: 'border-box'
          }} className="custom-scrollbar">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                borderRadius: '5px',
                color: opt.value === value ? '#fff' : '#ccc',
                backgroundColor: opt.value === value ? `rgba(${color === 'purple' ? '157, 0, 255' : '0, 255, 204'}, 0.2)` : 'transparent',
                transition: 'all 0.2s ease',
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#ccc';
                }
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default NeonSelect;
