import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/**
 * @context AuthContext
 * @description Proveedor de estado global para la autenticación y datos del usuario. 
 * Escucha cambios en el estado de autenticación (Firebase Auth) y mantiene sincronizado el 
 * documento público del usuario y su subcolección privada mediante Firestore.
 * 
 * @economy Se suscribe a `users/{uid}` con `onSnapshot`, lo que genera una lectura de Firestore por cada actualización del documento. 
 * Además, hace un `getDoc` a la subcolección `private/contact` cada vez que el documento principal cambia, lo cual incrementa el coste de lecturas.
 * 
 * @risk Posible desincronización si el documento `private/contact` se actualiza pero no el documento principal, ya que no tiene un snapshot listener activo, sólo se lee cuando el principal cambia.
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
