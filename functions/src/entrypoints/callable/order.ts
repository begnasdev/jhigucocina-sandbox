/**
 * PURPOSE
 *   Callable entrypoints for order/order-item transitions (Document C #1, #2).
 *   fnOrderTransition, fnOrderItemTransition.
 *
 * EXPLANATION
 *   THIN wrappers only. They wire the guarded middleware (App Check, auth,
 *   role floor, validation, tracing) and will delegate to the order domain core.
 *   Sprint 1: structure + contract only — handlers throw NotImplementedError so
 *   no business workflow runs yet. Order status transitions are server-
 *   authoritative (security rules deny client updates to orders_active).
 *
 * DEPLOYMENT
 *   Exported via src/index.ts and deployed with the functions codebase:
 *   `firebase deploy --only functions:fnOrderTransition,functions:fnOrderItemTransition --project <alias>`
 */

import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { guarded, z } from "../../middleware/index.js";
import { NotImplementedError } from "../../shared/errors.js";

const transitionSchema = z.object({
  orderId: z.string().min(1),
  nextStatus: z.enum(["accepted", "preparing", "ready", "completed", "cancelled"]),
  reason: z.string().optional(),
  correlationId: z.string().optional(),
});

export const fnOrderTransition = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: transitionSchema, minRole: "staff", requireAppCheck: true, workflow: "order.transition" },
    async () => {
      throw new NotImplementedError("fnOrderTransition lands in the Orders workflow sprint");
    },
  ),
);

const itemTransitionSchema = z.object({
  orderId: z.string().min(1),
  itemIndex: z.number().int().nonnegative(),
  nextStatus: z.enum(["preparing", "ready", "served", "voided"]),
  correlationId: z.string().optional(),
});

export const fnOrderItemTransition = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: itemTransitionSchema, minRole: "staff", requireAppCheck: true, workflow: "order.itemTransition" },
    async () => {
      throw new NotImplementedError("fnOrderItemTransition lands in the Orders workflow sprint");
    },
  ),
);
