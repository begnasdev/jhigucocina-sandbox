/**
 * PURPOSE
 *   Scheduled maintenance (Document C #5/#3, Document D §6).
 *   fnPrepArchive (archive done/cancelled prep tasks off the hot board),
 *   fnExpiryWaste (waste prepared ingredients past shelf life).
 *
 * EXPLANATION
 *   Thin onSchedule wrappers keeping hot collections small (Document D cost
 *   strategy §14). Sprint 1: schedules registered; bodies are no-ops.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnPrepArchive,functions:fnExpiryWaste --project <alias>`
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnPrepArchive = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 02:30", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "prep.archive" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);

export const fnExpiryWaste = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 02:45", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "inventory.expiry" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);
