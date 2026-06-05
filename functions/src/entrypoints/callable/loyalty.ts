/**
 * PURPOSE
 *   Callable entrypoints for loyalty redeem/adjust (Document C #6).
 *   fnLoyaltyRedeem (customer/owner), fnLoyaltyAdjust (manager).
 *
 * EXPLANATION
 *   Thin wrappers. The loyalty ledger is Function-only (security rules deny
 *   client writes). Redeem validates balance inside the transaction; adjust is a
 *   manager correction. Earn is NOT here — it is a trigger reacting to order
 *   completion (see triggers/loyalty.ts). Sprint 1: contract + guards only.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:fnLoyaltyRedeem,functions:fnLoyaltyAdjust --project <alias>`
 */

import { onCall } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";
import { guarded, z } from "../../middleware/index.js";
import { NotImplementedError } from "../../shared/errors.js";

const redeemSchema = z.object({
  rewardId: z.string().min(1),
  orderId: z.string().optional(),
  correlationId: z.string().optional(),
});

export const fnLoyaltyRedeem = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: redeemSchema, minRole: "customer", requireAppCheck: true, workflow: "loyalty.redeem" },
    async () => {
      throw new NotImplementedError("fnLoyaltyRedeem lands in the Loyalty workflow sprint");
    },
  ),
);

const adjustSchema = z.object({
  uid: z.string().min(1),
  points: z.number().int(),
  reason: z.string().min(1),
  correlationId: z.string().optional(),
});

export const fnLoyaltyAdjust = onCall(
  { region: FUNCTIONS_REGION },
  guarded(
    { schema: adjustSchema, minRole: "manager", requireAppCheck: true, workflow: "loyalty.adjust" },
    async () => {
      throw new NotImplementedError("fnLoyaltyAdjust lands in the Loyalty workflow sprint");
    },
  ),
);
