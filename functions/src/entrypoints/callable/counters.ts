/**
 * PURPOSE
 *   Internal callable for human-readable sequence allocation (order #, PO #).
 *   fnCounter (Document C order/PO lifecycles; counters are Function-only).
 *
 * EXPLANATION
 *   Thin wrapper. counters/{id} is deny-all in security rules; sequences are
 *   allocated transactionally server-side (optionally sharded at high volume).
 *   Sprint 1: contract + guards only.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnCounter --project <alias>`
 */

import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { guarded, z } from "../../middleware/index.js";
import { NotImplementedError } from "../../shared/errors.js";

const counterSchema = z.object({
  scope: z.enum(["orders", "po"]),
  period: z.string().optional(),
  correlationId: z.string().optional(),
});

export const fnCounter = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: counterSchema, minRole: "staff", requireAppCheck: true, workflow: "counter.allocate" },
    async () => {
      throw new NotImplementedError("fnCounter lands with the Orders/Purchasing sprints");
    },
  ),
);
