/**
 * PURPOSE
 *   Initialize the Firebase Admin SDK once and expose the shared Firestore
 *   handle that all repositories use. Admin SDK BYPASSES security rules, which
 *   is exactly why ledger/transition writes are routed exclusively through here.
 *
 * EXPLANATION
 *   Sprint 1 provides the singleton db handle and the repository surface. Domain
 *   repositories (orderRepo, inventoryRepo, ledgerRepo, ...) are added in the
 *   workflow sprints; they MUST build paths from data/paths.ts and perform
 *   multi-document writes via runTransaction / batched writes (Document D §1.2).
 *
 * DEPLOYMENT
 *   Built with `npm run build`. Uses Application Default Credentials in the
 *   deployed runtime and emulator credentials locally.
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

// Repository modules (orderRepo, inventoryRepo, ...) will be exported here as
// the workflows are implemented. Intentionally empty in Sprint 1.
