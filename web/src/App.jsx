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
import Store from './pages/Store'
import SupportPage from './pages/SupportPage'
import PortConfigPage from './pages/PortConfigPage'
import TermsPage from './pages/TermsPage'
import './App.css'

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div>Cargando sesión...</div>;
  
  return currentUser ? children : <Navigate to="/login" />;
};

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
              <Route path="/terms" element={<PrivateRoute><TermsPage /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
