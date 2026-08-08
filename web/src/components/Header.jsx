import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './Header.css';
import logoImg from '../assets/logo.png';
import titleImg from '../assets/title.png';

const Header = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="main-navbar">
      {/* Left: Circular Logo */}
      <div className="navbar-left navbar-side" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img src={logoImg} alt="Talking Crow Logo" className="logo-img" />
        </Link>
      </div>

      {/* Center: Title & Navigation */}
      <div className="navbar-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src={titleImg} alt="Talking Crow" className="title-img" />
        </div>
        <nav style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 10 }}>
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Inicio</NavLink>
          <NavLink to="/creadores" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Creadores</NavLink>
          <NavLink to="/ecovoices" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Eco Voices</NavLink>
        </nav>
      </div>

      {/* Right: Croins Indicator & User Profile Dropdown */}
      <div className="navbar-right navbar-side" ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'flex-end' }}>
        {currentUser ? (
          <>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(0,255,204,0.1)', padding: '8px 15px', borderRadius: '25px', border: '1px solid var(--neon-green)', transition: 'all 0.3s' }}
              onClick={() => navigate('/dashboard')}
              title="Comprar más Croins"
            >
              <span style={{ fontSize: '1.2rem' }}>🪙</span>
              <span className="neon-text-green" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{userData?.Croins || 0} Croins</span>
            </div>
            
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img src={'/avatar_m.jpg'} alt="Menú de Usuario" className="avatar-placeholder" title="Menú de Usuario" style={{ objectFit: 'cover' }} />
              <button className="settings-gear-btn" title="Ajustes" style={{ pointerEvents: 'none' }}>⚙️</button>
            </div>
            
            {isDropdownOpen && (
              <div className="user-dropdown-menu">
                 <ul>
                   <li 
                     onClick={() => { navigate('/dashboard'); setIsDropdownOpen(false); }}
                     style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(157, 0, 255, 0.3)', paddingBottom: '12px', marginBottom: '8px' }}
                   >
                     <img src={'/avatar_m.jpg'} alt="Perfil" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-purple)' }} />
                     Cuenta Talking Crow
                   </li>
                   <li onClick={() => { navigate('/dashboard'); setIsDropdownOpen(false); }}>Suscripción y Pagos</li>
                   <li onClick={() => { navigate('/dashboard'); setIsDropdownOpen(false); }}>Contacto y soporte</li>
                   <li onClick={() => { navigate('/dashboard'); setIsDropdownOpen(false); }}>Términos y Condiciones</li>
                   <li 
                     style={{ color: '#ff6600', textAlign: 'center', borderTop: '1px solid rgba(255,102,0,0.3)', paddingTop: '12px', marginTop: '8px', fontWeight: 'bold' }} 
                     onClick={async () => { await signOut(auth); setIsDropdownOpen(false); navigate('/'); }}
                   >
                     Cerrar Sesión
                   </li>
                 </ul>
              </div>
            )}
          </>
        ) : (
          <button className="btn-neon" style={{ padding: '8px 15px' }} onClick={() => navigate('/login')}>
            Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
