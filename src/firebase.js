// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <--- 1. NEW IMPORT

const firebaseConfig = {
  apiKey: "AIzaSyCNMPrbG6GkkwShZGRC9Y7LcS9DGek5SpI",
  authDomain: "collegecrush-42b67.firebaseapp.com",
  projectId: "collegecrush-42b67",
  storageBucket: "collegecrush-42b67.firebasestorage.app",
  messagingSenderId: "450431922710",
  appId: "1:450431922710:web:8ba74bfeebc23b6ec17b37",
  measurementId: "G-1JNMTP4B8R"
};

const app = initializeApp(firebaseConfig);

// Exports used by the rest of your app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); // <--- 2. THIS WAS MISSING










