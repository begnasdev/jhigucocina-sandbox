import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA_oLYr8gUIjXEsBUlWiF70LgsOIsSq52g",
  authDomain: "jhigucocina.firebaseapp.com",
  projectId: "jhigucocina",
  storageBucket: "jhigucocina.firebasestorage.app",
  messagingSenderId: "375880446924",
  appId: "1:375880446924:web:3db0f59952171d1c71a369",
  measurementId: "G-YB05EFKN62"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics (safe in browser only)
let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { analytics };

export default app;