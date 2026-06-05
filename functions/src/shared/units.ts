/**
 * PURPOSE
 *   Ingredient unit conversion between purchase units and base (stock) units.
 *
 * EXPLANATION
 *   rawIngredients carry conversion.purchaseToBase (architecture §4.5). Recipe
 *   BOM explosion and PO receiving both need to normalize to base units. This
 *   centralizes conversion so inventory math is consistent. Sprint 1: shape +
 *   pure helpers only; no recipe explosion yet.
 *
 * DEPLOYMENT
 *   Pure library, built with `npm run build`. Unit-tested independently (§11).
 */

export interface Conversion {
  purchaseToBase: number; // 1 purchase unit = N base units
}

export function purchaseToBase(qtyPurchase: number, c: Conversion): number {
  return qtyPurchase * c.purchaseToBase;
}
export function baseToPurchase(qtyBase: number, c: Conversion): number {
  return c.purchaseToBase === 0 ? 0 : qtyBase / c.purchaseToBase;
}
