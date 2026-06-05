/**
 * PURPOSE
 *   Firestore trigger: fnOrderFulfill (Document C #1, Document D §6).
 *   Reacts when an active order reaches its fulfillment status and fans out to
 *   inventory (stock-out via BOM explosion) and loyalty.
 *
 * EXPLANATION
 *   Thin trigger wrapper. React-to-state, not to client: the callable commits
 *   the status; this trigger performs the side-effect fan-out, guarded by an
 *   idempotency flag (fulfillment.inventoryExploded) so at-least-once delivery
 *   is safe. Sprint 1: wiring + predicate skeleton only — no fan-out performed.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnOrderFulfill --project <alias>`
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnOrderFulfill = onDocumentUpdated(
  { region: FUNCTIONS_REGION, document: "providers/{pid}/orders_active/{orderId}" },
  async (event) => {
    const log = createLogger({ workflow: "order.fulfill", providerId: event.params.pid });
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    // Predicate: only act on the transition INTO the fulfillment status.
    // (Target status — 'ready' vs 'completed' — is provider config; [PRD-TBD].)
    const becameFulfilled =
      before.status !== after.status && after.status === "completed";
    if (!becameFulfilled) return;

    // TODO(orders sprint): idempotent BOM explosion -> stock-out movements,
    //   move active->history, enqueue loyalty earn. No-op in Sprint 1.
    log.info("order.fulfill.skipped", { reason: "Sprint 1 scaffold — no-op" });
  },
);
