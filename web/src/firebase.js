import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDMBVLTnF_0nxtrjbdPQWQQrvWL-1WBNRU",
  authDomain: "talking-crow.firebaseapp.com",
  projectId: "talking-crow",
  storageBucket: "talking-crow.firebasestorage.app",
  messagingSenderId: "220088008470",
  appId: "1:220088008470:web:a858a7027fc5eccfac1a37",
  measurementId: "G-7BHRTR907N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { db, storage, auth, functions };
