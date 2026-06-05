/**
 * PURPOSE
 *   Firestore trigger: fnRecipeCostRollup (Document C cross-cutting, Document D §6).
 *   Recompute recipe cost cache when a recipe or an ingredient cost changes,
 *   walking the prepared-ingredient tree (with cycle detection + depth limit).
 *
 * EXPLANATION
 *   Thin trigger wrapper. Watches recipes + ingredients; writes recipe/menu cost
 *   caches with a change-detect + cycle guard to prevent trigger loops. Sprint 1
 *   wires a single recipes watcher; ingredient watchers are added with the
 *   recipe sprint. No recompute performed yet.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnRecipeCostRollup --project <alias>`
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { createLogger } from "../../shared/logger.js";

export const fnRecipeCostRollup = onDocumentWritten(
  { region: FUNCTIONS_REGION, document: "providers/{pid}/recipes/{recipeId}" },
  async (event) => {
    const log = createLogger({ workflow: "recipe.costRollup", providerId: event.params.pid });
    const after = event.data?.after.data();
    if (!after) return;

    // TODO(recipe sprint): recursive BOM cost rollup with cycle/depth guards.
    // No-op in Sprint 1.
    log.info("recipe.costRollup.skipped", { reason: "Sprint 1 scaffold — no-op" });
  },
);
