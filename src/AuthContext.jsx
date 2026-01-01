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
  const [userProfile, setUserProfile] = useState(null); // <--- NEW: Stores DB Data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // --- MODIFICATION START ---
        // If the user is Anonymous (Admin), do NOT create a database entry.
        if (user.isAnonymous) {
          setLoading(false);
          return; 
        }
        // --- MODIFICATION END ---

        // Check Firestore for profile data
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          // Save the actual database data (branch, year, bio, etc.)
          setUserProfile(docSnap.data());
        } else {
          // New user: Create basic doc, but profile is incomplete
          const newUserData = {
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            uid: user.uid
          };
          await setDoc(userRef, newUserData);
          setUserProfile(newUserData); // Branch/Year will be missing here
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
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
    userProfile, // <--- Export this so App.jsx can use it
    googleSignIn,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{height: "100vh", display:"flex", justifyContent:"center", alignItems:"center"}}>
          Loading...
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}