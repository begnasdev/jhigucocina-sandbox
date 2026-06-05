/**
 * PURPOSE
 *   Scheduled suggestion generators (Document C #4/#5, Document D §6).
 *   fnPrepSuggest (create prep tasks where prepared on-hand < par),
 *   fnReorderSuggest (draft POs where raw on-hand <= reorder point).
 *
 * EXPLANATION
 *   Thin onSchedule wrappers. They create draft work, never commit physical or
 *   financial state, so they are safe to re-run. Sprint 1: schedules registered;
 *   bodies are no-ops.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnPrepSuggest,functions:fnReorderSuggest --project <alias>`
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnPrepSuggest = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 05:00", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "prep.suggest" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);

export const fnReorderSuggest = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 05:15", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "purchasing.reorderSuggest" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);
