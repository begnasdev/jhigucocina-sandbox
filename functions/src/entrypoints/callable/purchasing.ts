/**
 * PURPOSE
 *   Callable entrypoints for purchase-order transitions and receiving
 *   (Document C #4). fnPoTransition, fnPoReceive.
 *
 * EXPLANATION
 *   Thin wrappers. Draft POs are client-editable (security rules); submit and
 *   receive are server-authoritative because receiving writes stock-in
 *   movements + recomputes moving-average cost atomically. Sprint 1: contract +
 *   guards only; handlers throw NotImplementedError.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnPoTransition,functions:fnPoReceive --project <alias>`
 */

import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { guarded, z } from "../../middleware/index.js";
import { NotImplementedError } from "../../shared/errors.js";

const poTransitionSchema = z.object({
  poId: z.string().min(1),
  nextStatus: z.enum(["submitted", "cancelled"]),
  correlationId: z.string().optional(),
});

export const fnPoTransition = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: poTransitionSchema, minRole: "manager", requireAppCheck: true, workflow: "po.transition" },
    async () => {
      throw new NotImplementedError("fnPoTransition lands in the Purchasing workflow sprint");
    },
  ),
);

const poReceiveSchema = z.object({
  poId: z.string().min(1),
  lines: z.array(z.object({
    ingredientId: z.string().min(1),
    receivedBase: z.number().nonnegative(),
  })).min(1),
  correlationId: z.string().optional(),
});

export const fnPoReceive = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: poReceiveSchema, minRole: "staff", requireAppCheck: true, workflow: "po.receive" },
    async () => {
      throw new NotImplementedError("fnPoReceive lands in the Purchasing workflow sprint");
    },
  ),
);
