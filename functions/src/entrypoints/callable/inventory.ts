/**
 * PURPOSE
 *   Callable entrypoint for manual stock movements — adjust / count / waste
 *   (Document C #3). fnStockMovementApply.
 *
 * EXPLANATION
 *   Thin wrapper. The inventory ledger is Function-only (security rules deny
 *   client writes to inventory/stockMovements); this callable is the staff/
 *   manager path to record corrections. Sprint 1: contract + guards only;
 *   handler throws NotImplementedError. Real writes are transactional + keyed
 *   by source ref for idempotency (Sprint 2+).
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnStockMovementApply --project <alias>`
 */

import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { guarded, z } from "../../middleware/index.js";
import { NotImplementedError } from "../../shared/errors.js";

const movementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["adjust", "waste", "count"]),
  qtyBase: z.number(),
  note: z.string().optional(),
  correlationId: z.string().optional(),
});

export const fnStockMovementApply = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: movementSchema, minRole: "staff", requireAppCheck: true, workflow: "inventory.movement" },
    async () => {
      throw new NotImplementedError("fnStockMovementApply lands in the Inventory workflow sprint");
    },
  ),
);
