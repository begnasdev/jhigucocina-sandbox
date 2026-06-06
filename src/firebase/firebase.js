import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA_oLYr8gUIjXEsBUlWiF70LgsOIsSq52g",
  authDomain: "jhigucocina.firebaseapp.com",
  projectId: "jhigucocina",
  storageBucket: "jhigucocina.firebasestorage.app",
  messagingSenderId: "375880446924",
  appId: "1:375880446924:web:420c61b3f456a57b71a369",
  measurementId: "G-VV3ZLZGB5Z",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let analytics = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;