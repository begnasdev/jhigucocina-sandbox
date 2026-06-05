/**
 * PURPOSE
 *   Firestore trigger: fnLoyaltyEarn (Document C #6, Document D §6).
 *   Reacts to a completed order landing in orders_history and accrues points.
 *
 * EXPLANATION
 *   Thin trigger wrapper. Earn is idempotent per order ref (a duplicate trigger
 *   delivery must not double-accrue). Sprint 1: wiring + predicate only.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnLoyaltyEarn --project <alias>`
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnLoyaltyEarn = onDocumentCreated(
  { region: FUNCTIONS_REGION, document: "providers/{pid}/orders_history/{orderId}" },
  async (event) => {
    const log = createLogger({ workflow: "loyalty.earn", providerId: event.params.pid });
    const order = event.data?.data();
    if (!order) return;

    // Predicate: only accrue for orders tied to a loyalty account, not cancelled.
    const eligible = order.status === "completed" && order.loyalty?.accountUid;
    if (!eligible) return;

    // TODO(loyalty sprint): idempotent earn txn (key: order:{id}:loyaltyEarn) +
    //   balance/tier recompute. No-op in Sprint 1.
    log.info("loyalty.earn.skipped", { reason: "Sprint 1 scaffold — no-op" });
  },
);
