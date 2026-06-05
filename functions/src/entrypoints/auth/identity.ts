/**
 * PURPOSE
 *   Identity functions (Document D §6, security-rule strategy).
 *   fnClaimsSync — mirror users/{uid}.role into Auth custom claims { providerId,
 *   role } so security rules are O(1). fnUserProvision — ensure a user doc +
 *   userIndex entry on first sign-in.
 *
 * EXPLANATION
 *   Custom claims are what every security rule reads (firestore.rules). When a
 *   manager changes a user's role, fnClaimsSync updates the claim (with a value
 *   compare to avoid redundant writes) and the userIndex bootstrap doc. This is
 *   the bridge between the existing Firestore-stored role and the claims model.
 *   Sprint 1: triggers wired; bodies are no-ops (claims set in Sprint 2).
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnClaimsSync,functions:fnUserProvision --project <alias>`
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { beforeUserCreated } from "firebase-functions/v2/identity";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

// Mirror role -> custom claims when a user doc changes.
export const fnClaimsSync = onDocumentWritten(
  { region: FUNCTIONS_REGION, document: "providers/{pid}/users/{uid}" },
  async (event) => {
    const log = createLogger({ workflow: "identity.claimsSync", providerId: event.params.pid });
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return;
    if (before && before.role === after.role) return; // claim already correct

    // TODO(identity sprint): getAuth().setCustomUserClaims(uid, { providerId, role })
    //   + upsert userIndex/{uid}. No-op in Sprint 1.
    log.info("identity.claimsSync.skipped", { reason: "Sprint 1 scaffold — no-op" });
  },
);

// Blocking function on user creation (provisioning hook).
export const fnUserProvision = beforeUserCreated(
  { region: FUNCTIONS_REGION },
  async () => {
    // TODO(identity sprint): seed default customer claims / userIndex.
    // Sprint 1: no claim mutation (return undefined = allow creation unchanged).
    return;
  },
);
