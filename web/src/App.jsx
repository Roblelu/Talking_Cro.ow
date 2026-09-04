import React from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Header from './components/Header'
import Home from './pages/Home'
import CreatorsPage from './pages/CreatorsPage'
import EcoVoicesPage from './pages/EcoVoicesPage'
import OnlineCreatorsPage from './pages/OnlineCreatorsPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AccountPage from './pages/AccountPage'
import SubscriptionPage from './pages/SubscriptionPage'
import WithdrawPage from './pages/WithdrawPage'
import DesktopAuth from './pages/DesktopAuth'
import Store from './pages/Store'
import SupportPage from './pages/SupportPage'
import PortConfigPage from './pages/PortConfigPage'
import TermsPage from './pages/TermsPage'
import AdminLedger from './pages/AdminLedger'
import './App.css'

/**
 * Envoltorio para proteger rutas privadas.
 * ¿POR QUÉ EXISTE? 
 * - Evita que usuarios no autenticados accedan a secciones exclusivas (dashboard, configuración).
 * - Redirige al login de manera automática protegiendo el flujo de UX.
 * RIESGOS:
 * - Si `useAuth()` falla o es lento, la interfaz se bloquea en "Cargando sesión...".
 * - Su evaluación ocurre solo en el cliente; las verdaderas reglas de seguridad deben estar en Firestore Rules.
 * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos a renderizar si el usuario está autenticado.
 * @returns {React.ReactNode} Hijos o redirección a login.
 */
const PrivateRoute = ({ children }) => {
  const { currentUser, loading, profileStatus, profileError } = useAuth();
  
  if (loading || profileStatus === "loading") return <div>Cargando sesión...</div>;

  if (!currentUser) return <Navigate to="/login" replace />;

  // Una identidad sin perfil no debe entrar al dashboard ni ser expulsada. Se
  // conserva la sesión para que el propietario complete el registro faltante.
  if (profileStatus === "missing") {
    return <Navigate to="/register?resume=true" replace />;
  }

  if (profileStatus === "error") {
    return (
      <div role="alert" className="panel" style={{ maxWidth: '520px', margin: '40px auto', textAlign: 'center' }}>
        <h2>No pudimos cargar tu perfil</h2>
        <p>Tu sesión de Google sigue activa. Revisa tu conexión e intenta nuevamente.</p>
        <button className="btn-neon" onClick={() => window.location.reload()}>
          Reintentar
        </button>
        {profileError && <p style={{ opacity: 0.65, fontSize: '0.8rem' }}>Código: {profileError}</p>}
      </div>
    );
  }

  return children;
};

const TutorialManager = () => {
  const [isActive, setIsActive] = React.useState(!!document.body.dataset.tutorial);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsActive(!!document.body.dataset.tutorial);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-tutorial'] });
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && document.body.dataset.tutorial) {
        document.body.removeAttribute('data-tutorial');
        window.dispatchEvent(new Event('tutorial_update'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isActive) return null;

  return (
    <button
      onClick={() => {
        document.body.removeAttribute('data-tutorial');
        window.dispatchEvent(new Event('tutorial_update'));
      }}
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 100000,
        pointerEvents: 'auto',
        background: '#fff',
        color: '#0f172a',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>&times;</span> Salir del Tutorial (ESC)
    </button>
  );
};

/**
 * Componente principal de enrutamiento de la aplicación.
 * ¿POR QUÉ EXISTE?
 * - Define toda la estructura de navegación y las URL de la SPA usando `react-router-dom`.
 * - Centraliza el proveedor de autenticación (`AuthProvider`) para que toda la app reaccione a los cambios de sesión.
 * RIESGOS/OBSERVACIONES:
 * - A medida que crece, cargar todos los componentes aquí afectará el tiempo de carga inicial si no se implementa code-splitting (React.lazy).
 * @returns {JSX.Element} Aplicación principal.
 */
const Layout = () => (
  <div className="App">
    <Header />
    {/* <TutorialManager /> */}
    <main>
      <Outlet />
    </main>
  </div>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "creadores", element: <CreatorsPage /> },
      { path: "ecovoices", element: <EcoVoicesPage /> },
      { path: "creadores-online", element: <OnlineCreatorsPage /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "auth-desktop", element: <DesktopAuth /> },
      { path: "dashboard", element: <PrivateRoute><Dashboard /></PrivateRoute> },
      { path: "store", element: <PrivateRoute><Store /></PrivateRoute> },
      { path: "store/:streamerId", element: <PrivateRoute><Store /></PrivateRoute> },
      { path: "account", element: <PrivateRoute><AccountPage /></PrivateRoute> },
      { path: "subscription", element: <PrivateRoute><SubscriptionPage /></PrivateRoute> },
      { path: "withdraw", element: <PrivateRoute><WithdrawPage /></PrivateRoute> },
      { path: "support", element: <PrivateRoute><SupportPage /></PrivateRoute> },
      { path: "port", element: <PrivateRoute><PortConfigPage /></PrivateRoute> },
      { path: "admin/ledger", element: <PrivateRoute><AdminLedger /></PrivateRoute> },
      { path: "terms", element: <TermsPage /> },
      { path: "*", element: <Navigate to="/" /> }
    ]
  }
]);

const MAINTENANCE_MODE = true;

const MaintenancePage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#070709',
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: '#0d0c14',
        border: '1px solid rgba(157, 0, 255, 0.5)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '600px',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(157, 0, 255, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Acento sutil superior */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #9D00FF, #39FF14, #9D00FF)',
          opacity: 0.7
        }}></div>

        {/* Título */}
        <h1 style={{
          color: '#39FF14',
          fontSize: '2.5rem',
          fontWeight: 'bold',
          fontFamily: "'Orbitron', sans-serif",
          marginBottom: '16px',
          textShadow: '0 0 12px rgba(57, 255, 20, 0.4)',
        }}>
          Estamos en Construcción.
        </h1>
        
        {/* Subtítulo */}
        <h2 style={{
          color: '#f0f0f0',
          fontSize: '1.25rem',
          fontFamily: "'Orbitron', sans-serif",
          marginBottom: '24px',
          fontWeight: 'normal'
        }}>
          Estaremos en línea próximamente.
        </h2>
        
        {/* Body Text */}
        <p style={{
          color: '#a8a8b0',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '1.1rem',
          lineHeight: '1.6',
          margin: 0
        }}>
          Trabajamos arduamente en fortalecer nuestros servidores. Queremos asegurarnos de ofrecerte un servicio robusto que te permita crecer como streamer de forma estable y segura. 
          <br /><br />
          <span style={{ color: '#f0f0f0', fontWeight: 'bold' }}>Nos vemos pronto.</span>
        </p>

      </div>
    </div>
  );
};

function App() {
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />;
  }

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App


