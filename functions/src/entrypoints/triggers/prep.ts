/**
 * PURPOSE
 *   Firestore trigger: fnPrepProduce (Document C #5, Document D §6).
 *   When a prep task transitions to "done", produce the prepared-ingredient
 *   batch (stock-in) and consume its components (stock-out).
 *
 * EXPLANATION
 *   Thin trigger wrapper. Idempotent via producedMovementId. Sprint 1: wiring +
 *   predicate only.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnPrepProduce --project <alias>`
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnPrepProduce = onDocumentUpdated(
  { region: FUNCTIONS_REGION, document: "providers/{pid}/prepTasks/{taskId}" },
  async (event) => {
    const log = createLogger({ workflow: "prep.produce", providerId: event.params.pid });
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const becameDone = before.status !== "done" && after.status === "done";
    if (!becameDone) return;

    // TODO(prep sprint): idempotent produce(in)/consume(out) movements +
    //   release reservations. No-op in Sprint 1.
    log.info("prep.produce.skipped", { reason: "Sprint 1 scaffold — no-op" });
  },
);
