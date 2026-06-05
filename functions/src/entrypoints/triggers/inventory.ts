/**
 * PURPOSE
 *   Firestore trigger: fnRecomputeAvailability (Document C #3, Document D §6).
 *   When an inventory item's on-hand crosses a threshold, recompute affected
 *   menu items' availability (auto-86) and low-stock flags.
 *
 * EXPLANATION
 *   Thin trigger wrapper with a change-detection guard so it never re-triggers
 *   itself (it watches inventory, writes menu). Sprint 1: wiring + guard only.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnRecomputeAvailability --project <alias>`
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnRecomputeAvailability = onDocumentWritten(
  { region: FUNCTIONS_REGION, document: "providers/{pid}/inventory/{itemId}" },
  async (event) => {
    const log = createLogger({ workflow: "inventory.availability", providerId: event.params.pid });
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!after) return; // deletion — ignore

    // Guard: only act when on-hand actually changed (cost control).
    if (before && before.onHand === after.onHand) return;

    // TODO(inventory sprint): recompute menu.availabilityComputed for dependent
    //   items + low-stock flags. No-op in Sprint 1.
    log.info("inventory.availability.skipped", { reason: "Sprint 1 scaffold — no-op" });
  },
);
