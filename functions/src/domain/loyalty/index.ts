/**
 * PURPOSE
 *   loyalty domain core — earn/redeem/tier rules (Doc C #6).
 *
 * EXPLANATION
 *   PURE business logic for the loyalty workflow. NO Firebase/Functions imports
 *   live in this layer (Document D §1.2) so it is fast to unit-test in isolation.
 *   Entrypoints (callable/trigger/scheduled) and repositories delegate here.
 *   Sprint 1: module boundary only — no business logic implemented yet.
 *
 * DEPLOYMENT
 *   Pure library, compiled with `npm run build`. Unit-tested under test/unit.
 */

export const __domain = "loyalty" as const;

// Domain functions (transition planners, calculators) are added in the
// corresponding workflow sprint. Intentionally empty in Sprint 1.
