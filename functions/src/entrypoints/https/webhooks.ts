/**
 * PURPOSE
 *   HTTPS webhook endpoints (Document D §1, §5.2). External integrations:
 *   payment provider callbacks [PRD-TBD], BigQuery/export hooks.
 *
 * EXPLANATION
 *   Thin onRequest wrapper. Webhooks MUST verify a signature before acting and
 *   MUST be idempotent (providers retry). Sprint 1: a single health endpoint
 *   that proves deploy wiring; real webhook handlers land when the payment
 *   provider is chosen.
 *
 * DEPLOYMENT
 *   `firebase deploy --only functions:webhook --project <alias>`
 *   The deployed URL is the callback target configured in the external provider.
 */

import { onRequest } from "firebase-functions/v2/https";
import { FUNCTIONS_REGION } from "../../shared/config.js";

export const webhook = onRequest(
  { region: FUNCTIONS_REGION },
  (req, res) => {
    // Sprint 1: health/readiness only. No signature verification logic yet
    // because no external provider is integrated.
    if (req.path === "/health") {
      res.status(200).json({ ok: true, sprint: 1 });
      return;
    }
    res.status(501).json({ error: "Webhook handlers not implemented in Sprint 1" });
  },
);
