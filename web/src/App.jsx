import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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

/**
 * Componente principal de enrutamiento de la aplicación.
 * ¿POR QUÉ EXISTE?
 * - Define toda la estructura de navegación y las URL de la SPA usando `react-router-dom`.
 * - Centraliza el proveedor de autenticación (`AuthProvider`) para que toda la app reaccione a los cambios de sesión.
 * RIESGOS/OBSERVACIONES:
 * - A medida que crece, cargar todos los componentes aquí afectará el tiempo de carga inicial si no se implementa code-splitting (React.lazy).
 * @returns {JSX.Element} Aplicación principal.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/creadores" element={<CreatorsPage />} />
              <Route path="/ecovoices" element={<EcoVoicesPage />} />
              <Route path="/creadores-online" element={<OnlineCreatorsPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth-desktop" element={<DesktopAuth />} />
              <Route 
                path="/dashboard" 
                element={<PrivateRoute><Dashboard /></PrivateRoute>} 
              />
              <Route path="/store" element={<PrivateRoute><Store /></PrivateRoute>} />
              <Route path="/store/:streamerId" element={<PrivateRoute><Store /></PrivateRoute>} />
              <Route path="/account" element={<PrivateRoute><AccountPage /></PrivateRoute>} />
              <Route path="/subscription" element={<PrivateRoute><SubscriptionPage /></PrivateRoute>} />
              <Route path="/withdraw" element={<PrivateRoute><WithdrawPage /></PrivateRoute>} />
              <Route path="/support" element={<PrivateRoute><SupportPage /></PrivateRoute>} />
              <Route path="/port" element={<PrivateRoute><PortConfigPage /></PrivateRoute>} />
              <Route path="/admin/ledger" element={<PrivateRoute><AdminLedger /></PrivateRoute>} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

