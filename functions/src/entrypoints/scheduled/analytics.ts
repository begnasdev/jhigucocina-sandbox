/**
 * PURPOSE
 *   Scheduled analytics (Document C analytics, Document D §6/§14).
 *   fnAnalyticsRollup (precompute daily/menu/inventory rollups),
 *   fnBigQueryExport (stream analytics/events to BigQuery, mark exported).
 *
 * EXPLANATION
 *   Thin onSchedule wrappers. Rollups are recomputable/idempotent for any date
 *   (Document D §15) so a failed run is simply re-run. Dashboards read ONLY
 *   these rollups — never aggregate raw collections (cost strategy §14).
 *   Sprint 1: schedules registered; bodies are no-ops.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnAnalyticsRollup,functions:fnBigQueryExport --project <alias>`
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnAnalyticsRollup = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every day 01:00", timeZone: "America/Los_Angeles" },
  async () => {
    createLogger({ workflow: "analytics.rollup" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);

export const fnBigQueryExport = onSchedule(
  { region: FUNCTIONS_REGION, schedule: "every 1 hours" },
  async () => {
    createLogger({ workflow: "analytics.export" }).info("skipped", { reason: "Sprint 1 no-op" });
  },
);
