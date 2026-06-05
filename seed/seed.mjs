/**
 * =============================================================================
 * PURPOSE
 *   Deterministic seed loader for JhiguCocina (Document D §7, §8).
 *   Loads roles/claims, provider, staff users, menu, and inventory into a
 *   target project so every local/dev run starts from a known state.
 *
 * EXPLANATION
 *   Uses firebase-admin (bypasses security rules) against the EMULATOR by
 *   default (FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST). It:
 *     1. creates Auth users + sets custom claims {providerId, role}
 *        (the same claims fnClaimsSync sets in production),
 *     2. writes the provider config, user docs, vendors, ingredients,
 *        inventory caches, menu categories and items.
 *   It intentionally does NOT write any ledger entries (stockMovements,
 *   loyalty transactions) — those are Function-only/append-only by design.
 *   Re-running is idempotent (fixed doc ids, merge writes).
 *
 * DEPLOYMENT / USAGE
 *   Against emulators (default, safe):
 *     firebase emulators:exec --project jhigucocina-dev "node seed/seed.mjs"
 *   Against the live DEV project (explicit opt-in):
 *     SEED_TARGET=dev GOOGLE_APPLICATION_CREDENTIALS=... node seed/seed.mjs
 *   GUARD: refuses to run against the production project id.
 * =============================================================================
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const __dir = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(__dir, f), "utf8"));

const PROJECT = process.env.GCLOUD_PROJECT || "jhigucocina-dev";
if (PROJECT === "jhigucocina") {
  console.error("Refusing to seed the PRODUCTION project. Aborting.");
  process.exit(1);
}

initializeApp({ projectId: PROJECT });
const db = getFirestore();
const auth = getAuth();

const roles = load("roles.json");
const provider = load("data/provider.json");
const usersDoc = load("data/users.json");
const menu = load("data/menu.json");
const inv = load("data/inventory.json");
const PID = provider.providerId;

const strip = (o) => { const { _meta, ...rest } = o; return rest; };

async function seedUsers() {
  for (const u of usersDoc.users) {
    try {
      await auth.createUser({ uid: u.uid, email: u.email, password: usersDoc.password, displayName: u.displayName });
    } catch (e) {
      if (e.code !== "auth/uid-already-exists" && e.code !== "auth/email-already-exists") throw e;
    }
    await auth.setCustomUserClaims(u.uid, { providerId: PID, role: u.role });
    await db.doc(`providers/${PID}/users/${u.uid}`).set({
      uid: u.uid, email: u.email, role: u.role, providerId: PID,
      displayName: u.displayName, status: "active", ...(u.staff ? { staff: u.staff } : {}),
    }, { merge: true });
    await db.doc(`userIndex/${u.uid}`).set({ uid: u.uid, providerId: PID, role: u.role }, { merge: true });
  }
}

async function run() {
  console.log(`Seeding project=${PROJECT} provider=${PID}`);
  await db.doc(`providers/${PID}`).set(strip(provider), { merge: true });
  await db.doc(`providerDirectory/${PID}`).set({ providerId: PID, name: provider.name, slug: provider.slug, status: provider.status }, { merge: true });

  await seedUsers();

  for (const c of menu.categories) await db.doc(`providers/${PID}/menuCategories/${c.id}`).set(c, { merge: true });
  for (const i of menu.items) {
    const { id, ...rest } = i;
    await db.doc(`providers/${PID}/menu/${id}`).set(rest, { merge: true });
  }

  for (const v of inv.vendors) { const { id, ...rest } = v; await db.doc(`providers/${PID}/vendors/${id}`).set(rest, { merge: true }); }
  for (const ing of inv.rawIngredients) { const { id, ...rest } = ing; await db.doc(`providers/${PID}/rawIngredients/${id}`).set(rest, { merge: true }); }
  for (const it of inv.inventory) await db.doc(`providers/${PID}/inventory/${it.itemId}`).set(it, { merge: true });

  console.log(`Done. Roles loaded: ${roles.roles.join(", ")}. Users: ${usersDoc.users.length}.`);
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
