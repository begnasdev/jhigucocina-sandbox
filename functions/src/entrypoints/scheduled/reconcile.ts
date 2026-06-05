/**
 * PURPOSE
 *   Scheduled reconcilers (Document C #3/#6, Document D §6/§13.2).
 *   fnInventoryReconcile, fnLoyaltyReconcile — rebuild denormalized caches from
 *   their append-only ledgers and flag drift. The self-healing layer.
 *
 * EXPLANATION
 *   Thin onSchedule wrappers. Reconcilers make the system tolerant of any missed
 *   or duplicated event: onHand = Σ stockMovements, pointsBalance = Σ
 *   transactions. Sprint 1: schedules registered; bodies are no-ops. In the
 *   emulator they can be invoked manually (Document D §7).
 *
 * DEPLOYMENT
 *   Deployed with the codebase; Cloud Scheduler jobs are created automatically.
 *   `firebase deploy --only functions:fnInventoryReconcile,functions:fnLoyaltyReconcile --project <alias>`
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnInventoryReconcile = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 03:00", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "inventory.reconcile" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);

export const fnLoyaltyReconcile = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 03:15", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "loyalty.reconcile" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);
