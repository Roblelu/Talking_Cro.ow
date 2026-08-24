const fs = require('fs');
let content = fs.readFileSync('web/src/pages/Register.jsx', 'utf8');

const target = // 1. Check if username is available before opening popup
      const usernameRef = doc(db, "usernames", cleanUsername);
      const usernameSnap = await getDoc(usernameRef);
      
      if (usernameSnap.exists()) {
         return setError("El nombre de usuario ya está ocupado. Elige otro.");
      }

      // 2. Open Google Auth
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);;

const replacement = const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const usernameRef = doc(db, "usernames", cleanUsername);
      const usernameSnap = await getDoc(usernameRef);
      if (usernameSnap.exists() && usernameSnap.data().uid !== user.uid) {
         await auth.signOut();
         return setError("El nombre de usuario ya está ocupado. Elige otro.");
      };

// Regex to catch possible weird characters
content = content.replace(/\/\/ 1\. Check if username is available before opening popup[\s\S]*?const userCredential = await signInWithPopup\(auth, provider\);/, replacement);

fs.writeFileSync('web/src/pages/Register.jsx', content);
console.log("Replaced!");
