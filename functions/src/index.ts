/**
 * PURPOSE
 *   Cloud Functions deploy MANIFEST. This file ONLY re-exports entrypoints —
 *   the Firebase CLI deploys whatever is exported here (Document D §2).
 *
 * EXPLANATION
 *   No logic lives in this file. Each export is a thin entrypoint that delegates
 *   to the (currently empty) domain core. In Sprint 1 every callable throws
 *   NotImplementedError and every trigger/scheduled function is a guarded no-op,
 *   so deploying this manifest stands up the full platform surface WITHOUT
 *   running any business workflow.
 *
 * DEPLOYMENT
 *   firebase deploy --only functions --project <dev|staging|prod>
 *   (firebase.json predeploy runs `npm run lint && npm run build` first.)
 */

// --- Callable (client -> server authority) ---
export { fnOrderTransition, fnOrderItemTransition } from "./entrypoints/callable/order.js";
export { fnStockMovementApply } from "./entrypoints/callable/inventory.js";
export { fnPoTransition, fnPoReceive } from "./entrypoints/callable/purchasing.js";
export { fnPrepTaskTransition } from "./entrypoints/callable/prep.js";
export { fnLoyaltyRedeem, fnLoyaltyAdjust } from "./entrypoints/callable/loyalty.js";
export { fnCounter } from "./entrypoints/callable/counters.js";

// --- Firestore triggers (choreography) ---
export { fnOrderFulfill } from "./entrypoints/triggers/order.js";
export { fnRecomputeAvailability } from "./entrypoints/triggers/inventory.js";
export { fnLoyaltyEarn } from "./entrypoints/triggers/loyalty.js";
export { fnPrepProduce } from "./entrypoints/triggers/prep.js";
export { fnRecipeCostRollup } from "./entrypoints/triggers/recipe.js";

// --- Scheduled (cron) ---
export { fnInventoryReconcile, fnLoyaltyReconcile } from "./entrypoints/scheduled/reconcile.js";
export { fnPrepArchive, fnExpiryWaste } from "./entrypoints/scheduled/maintenance.js";
export { fnPrepSuggest, fnReorderSuggest } from "./entrypoints/scheduled/suggestions.js";
export { fnLoyaltyExpire } from "./entrypoints/scheduled/loyalty.js";
export { fnAnalyticsRollup, fnBigQueryExport } from "./entrypoints/scheduled/analytics.js";

// --- Auth / identity ---
export { fnClaimsSync, fnUserProvision } from "./entrypoints/auth/identity.js";

// --- HTTPS / webhooks ---
export { webhook } from "./entrypoints/https/webhooks.js";
