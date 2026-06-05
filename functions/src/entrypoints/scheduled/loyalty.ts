/**
 * PURPOSE
 *   Scheduled loyalty maintenance (Document C #6, Document D §6).
 *   fnLoyaltyExpire — expire points past the configured window [PRD-TBD].
 *
 * EXPLANATION
 *   Thin onSchedule wrapper. Writes append-only "expire" transactions (never
 *   edits history). Sprint 1: schedule registered; body is a no-op.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnLoyaltyExpire --project <alias>`
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnLoyaltyExpire = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 04:00", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "loyalty.expire" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);
