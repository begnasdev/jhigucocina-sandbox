/**
 * PURPOSE
 *   Canonical state-machine DEFINITIONS for every workflow (Document C).
 *   This is the SAME logic the client mirrors in lib/stateMachines, guaranteeing
 *   client and server never disagree on legal transitions.
 *
 * EXPLANATION
 *   Sprint 1 ships the transition TABLES and a generic guard only — no side
 *   effects, no Firestore. The owning domain modules (Sprint 2+) consume these
 *   to validate transitions before fan-out. The order machine intentionally
 *   matches the existing client ORDER_FLOW in src/services/orderService.js.
 *
 * DEPLOYMENT
 *   Pure library, built with `npm run build`. Heavily unit-tested (§11).
 */

export type Transitions<S extends string> = Record<S, readonly S[]>;

/** Generic guard: is `to` reachable from `from` in machine `m`? */
export function canTransition<S extends string>(
  m: Transitions<S>,
  from: S,
  to: S,
): boolean {
  return (m[from] ?? []).includes(to);
}

// --- Order (matches existing orderService.js forward flow + additive cancel) ---
export type OrderStatus =
  | "placed" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
export const orderMachine: Transitions<OrderStatus> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// --- Order item ---
export type OrderItemStatus =
  | "queued" | "preparing" | "ready" | "served" | "voided";
export const orderItemMachine: Transitions<OrderItemStatus> = {
  queued: ["preparing", "voided"],
  preparing: ["ready", "voided"],
  ready: ["served", "voided"],
  served: [],
  voided: [],
};

// --- Purchase order ---
export type PoStatus =
  | "draft" | "submitted" | "partial" | "received" | "cancelled";
export const poMachine: Transitions<PoStatus> = {
  draft: ["submitted", "cancelled"],
  submitted: ["partial", "received", "cancelled"],
  partial: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

// --- Prep task (prepared ingredient production) ---
export type PrepStatus = "todo" | "in_progress" | "done" | "cancelled";
export const prepMachine: Transitions<PrepStatus> = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["done", "cancelled"],
  done: [],
  cancelled: [],
};

// --- Staff assignment (per shift context) ---
export type AssignStatus = "available" | "assigned";
export const assignMachine: Transitions<AssignStatus> = {
  available: ["assigned"],
  assigned: ["assigned", "available"],
};
