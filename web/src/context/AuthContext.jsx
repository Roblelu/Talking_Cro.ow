import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // En un futuro multi-streamer, usaríamos el ID del streamer actual, pero por ahora "vridel"
        const username = user.displayName || user.email.split('@')[0];
        const docRef = doc(db, "streamers", "vridel", "fans", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // Leer también la información privada
          const privateDocRef = doc(db, "streamers", "vridel", "fans", user.uid, "private", "contact");
          const privateSnap = await getDoc(privateDocRef);
          const privateData = privateSnap.exists() ? privateSnap.data() : {};
          setUserData({ ...docSnap.data(), ...privateData });
        } else {
          // Si el usuario es nuevo, creamos el documento público y el privado
          const newData = { Croins: 0, isPro: false, username: username };
          await setDoc(docRef, newData);

          const privateDocRef = doc(db, "streamers", "vridel", "fans", user.uid, "private", "contact");
          const privateData = { email: user.email };
          await setDoc(privateDocRef, privateData);

          setUserData({ ...newData, ...privateData });
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
