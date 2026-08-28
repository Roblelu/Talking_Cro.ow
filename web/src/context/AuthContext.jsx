import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

/**
 * Hook para consumir el contexto de autenticación.
 * @returns {{currentUser: object, userData: object, loading: boolean, profileStatus: string, profileError: string|null}}
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Proveedor de contexto para manejar el estado global de la sesión.
 * ¿POR QUÉ EXISTE?
 * - Observa los cambios de estado en Firebase Auth y distribuye la información (`currentUser`).
 * - Obtiene en tiempo real (`onSnapshot`) el documento público del usuario y su documento privado.
 * - Evita realizar consultas redundantes a Firestore desde cada componente individual.
 *
 * ECONOMÍA Y COSTOS ASOCIADOS:
 * - Cada recarga o cambio de usuario dispara una lectura de `getDoc` (users/{uid}/private/contact) y
 *   mantiene un listener `onSnapshot` (users/{uid}). Los `onSnapshot` cobran una lectura cada vez que el documento cambia.
 * 
 * SEGURIDAD:
 * - La exposición de PII a través de `onSnapshot` está correctamente prevenida mediante 
 *   firestore.rules, las cuales aseguran que cada usuario solo lea lo que le corresponde.
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState("loading");
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let unsubscribeDoc = null;

    const stopProfileListener = () => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
        unsubscribeDoc = null;
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      stopProfileListener();
      setCurrentUser(user);
      setUserData(null);
      setProfileError(null);

      if (user) {
        setProfileStatus("loading");
        const docRef = doc(db, "users", user.uid);

        unsubscribeDoc = onSnapshot(
          docRef,
          async (docSnap) => {
            try {
              // Evita que una lectura lenta de la sesión anterior reemplace los
              // datos del usuario que acaba de autenticarse.
              if (auth.currentUser?.uid !== user.uid) return;

              if (!docSnap.exists()) {
                setUserData(null);
                setProfileStatus("missing");
                return;
              }

              const privateDocRef = doc(db, "users", user.uid, "private", "contact");
              const privateSnap = await getDoc(privateDocRef);
              if (auth.currentUser?.uid !== user.uid) return;

              const privateData = privateSnap.exists() ? privateSnap.data() : {};
              setUserData({ ...docSnap.data(), ...privateData });
              setProfileStatus("complete");
              setProfileError(null);
            } catch (error) {
              console.error("[AuthContext]", {
                stage: "private_profile_read",
                code: error?.code || error?.name || "unknown"
              });
              setProfileError(error?.code || "profile-read-failed");
              setProfileStatus("error");
            } finally {
              setLoading(false);
            }
          },
          (error) => {
            console.error("[AuthContext]", {
              stage: "public_profile_listener",
              code: error?.code || error?.name || "unknown"
            });
            setUserData(null);
            setProfileError(error?.code || "profile-listener-failed");
            setProfileStatus("error");
            setLoading(false);
          }
        );
      } else {
        setProfileStatus("anonymous");
        setLoading(false);
      }
    }, (error) => {
      console.error("[AuthContext]", {
        stage: "auth_state_listener",
        code: error?.code || error?.name || "unknown"
      });
      stopProfileListener();
      setCurrentUser(null);
      setUserData(null);
      setProfileError(error?.code || "auth-state-failed");
      setProfileStatus("error");
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      stopProfileListener();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    profileStatus,
    profileError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
