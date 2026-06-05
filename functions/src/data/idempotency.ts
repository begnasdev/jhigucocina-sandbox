/**
 * PURPOSE
 *   Idempotency guard helpers — the backbone of reliable side effects
 *   (Document D §5.3). Every side-effecting function derives a deterministic
 *   key and no-ops on duplicate delivery (Firestore triggers are at-least-once).
 *
 * EXPLANATION
 *   Sprint 1 ships the key builders + the guard contract only. The actual
 *   transactional "claim this key inside the same write" implementation lands
 *   with the workflows that use it (Sprint 2+), so stock/points can never be
 *   double-applied.
 *
 * DEPLOYMENT
 *   Library module, built with `npm run build`.
 */

export const idempotencyKey = {
  orderFulfill: (orderId: string) => `order:${orderId}:fulfill`,
  loyaltyEarn: (orderId: string) => `order:${orderId}:loyaltyEarn`,
  poLineReceive: (poId: string, ingredientId: string, seq: number) =>
    `po:${poId}:line:${ingredientId}:receive:${seq}`,
  prepProduce: (taskId: string) => `prep:${taskId}:produce`,
  stockMovement: (sourceRef: string) => `stock:${sourceRef}`,
} as const;

/**
 * Contract implemented in Sprint 2+: given a transaction and a key, returns
 * false if already processed, otherwise marks it processed within the same txn.
 */
export interface IdempotencyGuard {
  claim(key: string): Promise<boolean>;
}
