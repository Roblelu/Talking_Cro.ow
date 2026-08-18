import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import './Header.css';
import logoImg from '../assets/logo.png';
import logoDegradado from '../assets/logo-degradado.png';
import titleImg from '../assets/title.png';

const Header = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const walletRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (walletRef.current && !walletRef.current.contains(event.target)) {
        setIsWalletOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isMissingFields = currentUser && (!userData?.username || !(userData?.email || currentUser?.email) || !(userData?.tiktok || userData?.tiktok_username));

  return (
    <header className="main-navbar">
      {/* Left: Circular Logo */}
      <div className="navbar-left navbar-side mobile-logo-container" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', width: '100%', height: '100%' }}>
          <img src={logoImg} alt="Talking Cro.ow Logo" className="logo-img desktop-logo" />
          <img src={logoDegradado} alt="Talking Cro.ow Logo" className="logo-img mobile-logo" />
        </Link>
      </div>

      {/* Center: Title & Navigation */}
      <div className="navbar-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src={titleImg} alt="Talking Cro.ow" className="title-img" />
        </div>
        
        {/* Botón de Menú Hamburguesa (visible solo en móviles) */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <svg viewBox="0 0 24 24" width="30" height="30" fill="var(--neon-orange)">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="34" height="34" fill="var(--neon-green)">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          )}
        </button>

        <nav className={`main-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          {currentUser && (
            <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
          )}
          <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Inicio</NavLink>
          <NavLink to="/creadores" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Creadores</NavLink>
          <NavLink to="/ecovoices" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Eco Voices</NavLink>
          <NavLink to="/creadores-online" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Creadores Online</NavLink>
        </nav>
      </div>

      {/* Right: Wallet Dropdown & User Profile Dropdown */}
      <div className="navbar-right navbar-side">
        {currentUser ? (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* Botón de Wallet */}
            <div style={{ position: 'relative' }} ref={walletRef}>
              <button 
                className="btn-neon" 
                style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'transparent', height: '40px' }}
                onClick={() => setIsWalletOpen(!isWalletOpen)}
                title="Mi Billetera"
              >
                <span style={{ fontSize: '1.4rem', transform: 'translateY(-3px)' }}>💳</span>
                <span className="neon-text-green" style={{ fontWeight: 'bold', letterSpacing: '1px', transform: 'translateY(1px)' }}>WALLET</span>
              </button>
              
              {isWalletOpen && (
                <div className="user-dropdown-menu" style={{ width: '220px', right: 0, padding: '10px' }}>
                  <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', borderBottom: '1px solid rgba(0, 240, 255, 0.2)', paddingBottom: '8px' }}>
                    Saldos Disponibles
                  </div>
                  <div className="credits-wrapper" style={{ flexDirection: 'column', gap: '10px', display: 'flex' }}>
                    <div 
                      className="header-indicator"
                      style={{ background: 'rgba(0,255,204,0.1)', border: '1px solid var(--neon-green)', width: '100%', justifyContent: 'flex-start' }}
                      onClick={() => { navigate('/dashboard'); setIsWalletOpen(false); }}
                    >
                      <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>🪙</span>
                      <span className="neon-text-green" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{((userData?.purchased_croins || 0) + (userData?.promotional_croins || 0))} Croins</span>
                    </div>
                    
                    {(userData?.has_received_app_credits || userData?.creator_credits > 0 || userData?.isPro) && (
                      <div 
                        className="header-indicator"
                        style={{ background: 'rgba(255,117,24,0.1)', border: '1px solid var(--neon-orange)', width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => { navigate('/dashboard'); setIsWalletOpen(false); }}
                      >
                        <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>✨</span>
                        <span className="neon-text-orange" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{userData?.creator_credits || 0} Créditos</span>
                      </div>
                    )}

                    <div 
                      className="header-indicator"
                      style={{ background: 'rgba(157, 0, 255, 0.1)', border: '1px solid var(--neon-purple)', width: '100%', justifyContent: 'flex-start' }}
                      onClick={() => { navigate('/withdraw'); setIsWalletOpen(false); }}
                    >
                      <span style={{ fontSize: '1.2rem', marginRight: '10px' }}>💰</span>
                      <span className="neon-text-purple" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {Math.floor((userData?.creator_earnings || 0) * (28 / 12))} Croin Cash
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Menú de Usuario */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <img src={'/avatar_user.png'} alt="Menú de Usuario" className="avatar-placeholder" title="Menú de Usuario" style={{ objectFit: 'cover' }} />
                <button className="settings-gear-btn" title="Ajustes" style={{ pointerEvents: 'none' }}>
                  ⚙️
                  {isMissingFields && <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '10px', height: '10px', backgroundColor: '#ff003c', borderRadius: '50%', boxShadow: '0 0 8px #ff003c', animation: 'pulse 1.5s infinite' }}></span>}
                </button>
              </div>
            
            {isDropdownOpen && (
              <div className="user-dropdown-menu">
                 <ul>
                   <li 
                     onClick={() => { navigate('/account'); setIsDropdownOpen(false); }}
                     style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(157, 0, 255, 0.3)', paddingBottom: '12px', marginBottom: '8px', color: '#00f0ff', fontWeight: 'bold' }}
                   >
                     <img src={'/avatar_user.png'} alt="Perfil" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-purple)' }} />
                     <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                       <span>Cuenta Talking Cro.ow</span>
                       {isMissingFields && <span style={{ width: '8px', height: '8px', backgroundColor: '#ff003c', borderRadius: '50%', boxShadow: '0 0 8px #ff003c', animation: 'pulse 1.5s infinite' }}></span>}
                     </div>
                   </li>
                   <li onClick={() => { navigate('/subscription'); setIsDropdownOpen(false); }}>Suscripción y Pagos</li>
                   <li onClick={() => { navigate('/withdraw'); setIsDropdownOpen(false); }}>
                     Retiro de Ganancias
                   </li>
                   <li onClick={() => { navigate('/support'); setIsDropdownOpen(false); }}>Contacto y soporte</li>
                   <li onClick={() => { navigate('/terms'); setIsDropdownOpen(false); }}>Términos y Condiciones</li>
                   <li 
                     style={{ color: '#ff6600', textAlign: 'center', borderTop: '1px solid rgba(255,102,0,0.3)', paddingTop: '12px', marginTop: '8px', fontWeight: 'bold' }} 
                     onClick={async () => { await signOut(auth); setIsDropdownOpen(false); navigate('/'); }}
                   >
                     Cerrar Sesión
                   </li>
                 </ul>
              </div>
            )}
            </div>
          </div>
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
