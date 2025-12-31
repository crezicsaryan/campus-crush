import React, { useContext, useState, useEffect } from "react";
import { auth, googleProvider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // <--- NEW: Loading State

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Set the user immediately so the UI reacts fast
        setCurrentUser(user);
        
        // 2. Check if user exists in Firestore, if not create basic doc
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            uid: user.uid
          }, { merge: true });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false); // <--- STOP LOADING once Firebase replies
    });

    return unsubscribe;
  }, []);

  const googleSignIn = () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    googleSignIn,
    logout,
    loading // <--- Export this so App.jsx can use it
  };

  return (
    <AuthContext.Provider value={value}>
      {/* If still loading, show NOTHING (or a spinner) instead of children */}
      {loading ? <div style={{height: "100vh", display:"flex", justifyContent:"center", alignItems:"center"}}>Loading...</div> : children}
    </AuthContext.Provider>
  );
}