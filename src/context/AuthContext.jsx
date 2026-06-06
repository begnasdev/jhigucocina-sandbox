import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // STEP 1: get extra user data from Firestore
        const userRef = doc(
          db,
          "providers",
          "jhigucocina",
          "users",
          firebaseUser.uid
        );

        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const extraData = snap.data();

          // STEP 2: merge Firebase Auth + Firestore data
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            role: extraData.role || "customer",
            providerId: extraData.providerId || "jhigucocina",
          });
        } else {
          // fallback user if Firestore doc not found
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            role: "customer",
            providerId: "jhigucocina",
          });
        }
      } catch (error) {
        console.error("AuthContext error:", error);

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          role: "customer",
          providerId: "jhigucocina",
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}