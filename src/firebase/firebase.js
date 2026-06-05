/**
 * =============================================================================
 * PURPOSE
 *   Single Firebase client initialization for the JhiguCocina SPA.
 *
 * EXPLANATION (Sprint 1 platform change — Document D §7 & §9)
 *   Previously this file hardcoded the production firebaseConfig. That blocked
 *   the three-environment strategy (dev/staging/prod) and local emulator work.
 *   It now reads Vite env vars (import.meta.env.VITE_FIREBASE_*) so each build
 *   target points at its own isolated Firebase project, and conditionally
 *   connects to the local Emulator Suite when VITE_USE_EMULATORS === "true".
 *
 *   This is backward compatible: .env.production reproduces the exact original
 *   values, so a production build behaves identically to before. No UI, feature,
 *   or page logic is changed. The public exports (auth, db, storage, analytics,
 *   app) keep the same names and signatures used across the existing services.
 *
 * DEPLOYMENT
 *   - Local:   set VITE_USE_EMULATORS=true (in .env.local) and run the dev script
 *              with the emulator suite up (see seed/README + docs/E).
 *   - Builds:  `vite build --mode development|staging|production` picks the
 *              matching .env.<mode> file; CI injects these per environment.
 * =============================================================================
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAnalytics, isSupported } from "firebase/analytics";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services (same exported names as before — services depend on these)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Local Emulator Suite wiring (Document D §7). Guarded so a single HMR session
// never double-connects.
const useEmulators = env.VITE_USE_EMULATORS === "true";
if (useEmulators && typeof window !== "undefined" && !window.__JC_EMULATORS__) {
  window.__JC_EMULATORS__ = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  // eslint-disable-next-line no-console
  console.info("[firebase] Connected to local Emulator Suite");
}

// Analytics — browser only, never against emulators, and only where supported.
let analytics = null;
if (typeof window !== "undefined" && !useEmulators) {
  isSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {
      /* analytics unsupported in this context — non-fatal */
    });
}

export { analytics };

export default app;
