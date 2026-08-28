import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, signInWithRedirect, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  clearPendingRegistration,
  completeGoogleRegistration,
  getPostAuthPath,
  getRegistrationErrorMessage,
  isDesktopAuthRequest,
  isMobileAuthClient,
  logAuthFlowError,
  readPendingRegistration,
  savePendingRegistration,
  validateRegistrationUsername
} from "../services/googleRegistration";

/**
 * Componente de registro de nuevos usuarios.
 * ¿POR QUÉ EXISTE?
 * - Permite crear la cuenta de Firebase Auth enlazada con un perfil de Firestore.
 * - Asegura que el usuario proporcione un nombre de usuario único y acepte explícitamente las políticas de privacidad.
 * - Recupera identidades de Google cuyo perfil no se creó en un intento anterior.
 * 
 * ECONOMÍA Y COSTOS ASOCIADOS:
 * - Realiza escrituras múltiples mediante una transacción (crea documento `usernames`, `users`, y subcolección `private`).
 *   Esto incrementa la cantidad de escrituras (al menos 3) por cada nuevo registro.
 * 
 * SEGURIDAD:
 * - La validación de nombres de usuario y la inyección de saldos (ej. `purchased_croins`) están 
 *   exitosamente mitigadas porque las Reglas de Firestore bloquean escrituras inválidas o alteraciones de balances.
 * @returns {JSX.Element}
 */
export default function Register() {
  const [username, setUsername] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const { currentUser, profileStatus } = useAuth();
  const navigate = useNavigate();
  const redirectCheckStarted = useRef(false);

  useEffect(() => {
    // getRedirectResult consume el resultado pendiente; debe ejecutarse una sola
    // vez aunque AuthContext cambie de `missing` a `complete` durante la transacción.
    if (redirectCheckStarted.current) return undefined;
    redirectCheckStarted.current = true;

    let isActive = true;

    const completeRedirectRegistration = async () => {
      let pendingRegistration = null;

      try {
        const result = await getRedirectResult(auth);
        if (!isActive) return;

        if (result?.user) {
          pendingRegistration = readPendingRegistration();

          // Si el navegador perdió sessionStorage, Google ya autenticó al
          // usuario. Se conserva la sesión y se muestra el formulario otra vez.
          if (!pendingRegistration) {
            setRecoveryMode(true);
            setError("Google confirmó tu identidad, pero falta completar tu perfil. Elige nuevamente tu nombre de usuario.");
            return;
          }

          setUsername(pendingRegistration.displayUsername);
          setConsentAccepted(true);
          setIsSubmitting(true);
          await completeGoogleRegistration(result.user, pendingRegistration.displayUsername);
          clearPendingRegistration();

          navigate(
            getPostAuthPath(window.location.search, pendingRegistration.desktop),
            { replace: true }
          );
          return;
        }

        // AuthContext termina de resolver la sesión antes de renderizar rutas.
        // Esto permite recuperar una cuenta huérfana sin abrir Google otra vez.
        if (currentUser && profileStatus === "complete") {
          navigate(getPostAuthPath(window.location.search), { replace: true });
        } else if (
          currentUser &&
          (profileStatus === "missing" || new URLSearchParams(window.location.search).get("resume") === "true")
        ) {
          // Algunos navegadores restauran la sesión, pero no entregan un objeto
          // RedirectResult. Un estado local vigente sigue siendo suficiente para
          // completar el perfil del mismo UID autenticado.
          pendingRegistration = readPendingRegistration();
          if (profileStatus === "missing" && pendingRegistration) {
            setUsername(pendingRegistration.displayUsername);
            setConsentAccepted(true);
            setIsSubmitting(true);
            await completeGoogleRegistration(currentUser, pendingRegistration.displayUsername);
            clearPendingRegistration();
            navigate(
              getPostAuthPath(window.location.search, pendingRegistration.desktop),
              { replace: true }
            );
            return;
          }

          setRecoveryMode(true);
        }
      } catch (err) {
        if (!isActive) return;
        logAuthFlowError("registration_redirect", err);
        if (pendingRegistration?.displayUsername) {
          setUsername(pendingRegistration.displayUsername);
          setConsentAccepted(true);
        }
        setRecoveryMode(Boolean(auth.currentUser));
        setError(getRegistrationErrorMessage(err));
      } finally {
        if (isActive) setIsSubmitting(false);
      }
    };

    completeRedirectRegistration();
    return () => {
      isActive = false;
    };
  }, [currentUser, navigate, profileStatus]);

  const handleGoogleRegister = async () => {
    setError("");
    let displayUsername;

    try {
      displayUsername = validateRegistrationUsername(username).displayUsername;
    } catch (err) {
      return setError(getRegistrationErrorMessage(err));
    }

    if (!consentAccepted) {
      return setError("Debes aceptar el procesamiento de mensajes antes de continuar con Google.");
    }

    setIsSubmitting(true);
    try {
      // Recuperación: la identidad ya existe. Solo se completa Firestore y se
      // evita un segundo popup que podría seleccionar una cuenta diferente.
      if (currentUser && (recoveryMode || profileStatus === "missing")) {
        await completeGoogleRegistration(currentUser, displayUsername);
        clearPendingRegistration();
        navigate(getPostAuthPath(window.location.search), { replace: true });
        return;
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      if (isMobileAuthClient(navigator.userAgent)) {
        savePendingRegistration({
          displayUsername,
          desktop: isDesktopAuthRequest(window.location.search)
        });
        await signInWithRedirect(auth, provider);
      } else {
        const userCredential = await signInWithPopup(auth, provider);
        await completeGoogleRegistration(userCredential.user, displayUsername);
        clearPendingRegistration();
        navigate(getPostAuthPath(window.location.search), { replace: true });
      }
    } catch (err) {
      logAuthFlowError("registration_submit", err);
      setRecoveryMode(Boolean(auth.currentUser));
      setError(getRegistrationErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelRecovery = async () => {
    setIsSubmitting(true);
    try {
      clearPendingRegistration();
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      logAuthFlowError("registration_cancel", err);
      setError("No fue posible cerrar la sesión. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          {recoveryMode ? "Completar registro" : "Crear Cuenta"}
        </h2>
        {error && <div role="alert" style={{ color: '#ff003c', textAlign: 'center', marginBottom: '10px' }}>{error}</div>}
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {recoveryMode
            ? "Google ya confirmó tu identidad. Elige un nombre de usuario y acepta los términos para terminar de crear tu perfil."
            : "Elige un nombre de usuario, acepta los términos y regístrate rápido con Google."}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>Nombre de Usuario</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              placeholder="Ej. User_Name"
              style={{ margin: 0, padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(157, 0, 255, 0.3)', color: '#fff', fontSize: '1rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '5px' }}>
            <input type="checkbox" required id="privacy_consent" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} style={{ marginTop: '3px', flexShrink: 0, width: 'auto', marginBottom: 0 }} />
            <label htmlFor="privacy_consent" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'left', lineHeight: '1.4', flex: 1, minWidth: 0, wordBreak: 'break-word' }}>
              Acepto los <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-green)', textDecoration: 'underline' }}>Términos y Condiciones</a> y que mis mensajes y nombre de usuario pueden ser procesados temporalmente por modelos de Inteligencia Artificial (TTS) para la generación de audio.
            </label>
          </div>

          <button 
            onClick={handleGoogleRegister} 
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', 
              padding: '12px', borderRadius: '8px', background: '#fff', color: '#000', 
              border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '100%',
              fontSize: '1.05rem', marginTop: '10px', opacity: isSubmitting ? 0.65 : 1
            }}
          >
            <svg width="24" height="24" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            {isSubmitting ? "Procesando..." : (recoveryMode ? "Completar registro" : "Continuar con Google")}
          </button>

          {recoveryMode && (
            <button
              type="button"
              onClick={cancelRecovery}
              disabled={isSubmitting}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Cancelar y cerrar sesión
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)' }}>
          {!recoveryMode && <>¿Ya tienes cuenta? <span style={{color:'var(--neon-orange)', cursor:'pointer', fontWeight:'bold'}} onClick={() => navigate('/login')}>Inicia Sesión</span></>}
        </p>
      </div>
    </div>
  );
}
