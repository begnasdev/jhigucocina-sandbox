/**
 * PURPOSE
 *   Callable entrypoint for prep-task transitions (Document C #5).
 *   fnPrepTaskTransition (todo -> in_progress -> done -> cancelled).
 *
 * EXPLANATION
 *   Thin wrapper. Starting a task reserves components; completing it produces a
 *   prepared-ingredient batch (stock-in) while consuming components (stock-out)
 *   — both server-side and idempotent. Sprint 1: contract + guards only.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnPrepTaskTransition --project <alias>`
 */

import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { guarded, z } from "../../middleware/index.js";
import { NotImplementedError } from "../../shared/errors.js";

const prepSchema = z.object({
  taskId: z.string().min(1),
  nextStatus: z.enum(["in_progress", "done", "cancelled"]),
  correlationId: z.string().optional(),
});

export const fnPrepTaskTransition = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: prepSchema, minRole: "staff", requireAppCheck: true, workflow: "prep.transition" },
    async () => {
      throw new NotImplementedError("fnPrepTaskTransition lands in the Prep workflow sprint");
    },
  ),
);
