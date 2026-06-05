# JhiguCocina — Production Firestore Architecture

**Status:** Design / Data-modeling only (no implementation code)
**Author:** Lead Software Architect
**Date:** 2026-06-05
**Scope:** Full-product data architecture for the JhiguCocina platform on Firebase (Firestore, Auth, Storage, Functions, Analytics).

> ⚠️ **Source-of-scope note.** No PRD file was present in the repository or attached to the working session. This document therefore treats the feature list in the engagement brief as the authoritative scope (multi-provider, menu, recipes, raw/prepared ingredients, inventory, purchasing, vendors, prep lines, dine-in, QR ordering, loyalty, analytics). Where the PRD would normally pin down a business rule (e.g. loyalty accrual rate, tax model), the document marks it **`[PRD-TBD]`** and supplies a safe default that the schema can absorb without migration.

---

## 1. Design Principles & Compatibility Constraints

The existing codebase already commits us to a set of conventions. These are **load-bearing** and the entire design below preserves them so that no current screen, service, or query breaks.

| Existing convention (observed in code) | Where | Carried forward as |
|---|---|---|
| Everything tenant-scoped under `providers/{providerId}` | `menuService.js`, `orderService.js`, `userService.js`, `authService.js` | **Root multi-tenant boundary.** Every new collection is a subcollection of a provider. |
| `DEFAULT_PROVIDER_ID = "jhigucocina"` | `config/providerConfig.js` | Default tenant; `providerId` is always a function parameter, never hardcoded in new services. |
| Roles `customer / staff / manager / admin` | `config/roles.js` | Authorization model; mirrored into **Auth custom claims** for security rules. |
| User doc at `providers/{pid}/users/{uid}` with `{uid,email,role,providerId,createdAt}` | `authService.js`, `AuthContext.jsx` | Extended, not replaced. New fields are additive. |
| Order doc shape: `items[]`, `pricing{subtotal,tax,discount,total}`, `status`, `timeline{}`, `events[]` | `orderService.js` | **Frozen core.** New order capabilities (dine-in, QR, loyalty) are additive fields. |
| State machine `placed→accepted→preparing→ready→completed` with `canTransitionTo` | `orderService.js` | Preserved. Extended with optional `cancelled`/`void` branch (additive). |
| Hot/cold split: `orders_active` (live) → `orders_history` (delete-on-complete) | `orderService.js` | Generalized into a reusable pattern for all high-churn collections. |
| `serverTimestamp()`, `createdAt`/`updatedAt`, `events: arrayUnion(...)` audit trail | all services | Standard on every new document. |

**Additional principles introduced by this design:**

1. **Tenant isolation is structural, not just rule-based.** A document can only belong to one provider because its path contains the provider id. Security rules become a second line of defense, not the only one.
2. **Ledgers over mutable counters for anything financial or physical.** Inventory stock, loyalty points, and cash are modeled as append-only movement ledgers with a denormalized "current value" cache. This makes the system auditable and reconcilable — critical for a kitchen with real food cost and real money.
3. **Denormalize for read paths, normalize the source of truth.** Menu items cache the fields the customer app needs; recipes are the source of truth for cost/inventory. Writes fan out via Cloud Functions.
4. **Bounded documents.** No unbounded arrays inside hot documents. The order `events[]` array is acceptable (bounded ~10 entries per order lifecycle); anything that grows without bound (stock movements, loyalty transactions, analytics events) becomes a subcollection.
5. **Aggregation is precomputed.** Firestore cannot do ad-hoc analytics. All dashboard numbers are served from rollup documents maintained by Functions; raw event streams are exported to BigQuery for deep analysis.

---

## 2. Entity-Relationship Diagram (ERD)

Logical relationships across the whole product. (`1 — *` = one-to-many; `*—*` = many-to-many via join.)

```
                                  ┌─────────────────┐
                                  │    PROVIDER     │  (tenant root)
                                  │  /providers/{id}│
                                  └────────┬────────┘
        ┌──────────────┬─────────────┬─────┴───────┬───────────────┬──────────────┐
        │              │             │             │               │              │
   ┌────▼────┐   ┌─────▼─────┐  ┌────▼─────┐  ┌────▼─────┐   ┌─────▼─────┐  ┌─────▼──────┐
   │  USER   │   │ MENU_CAT  │  │   MENU   │  │  RECIPE  │   │ RAW_INGR  │  │ PREP_INGR  │
   └────┬────┘   └─────┬─────┘  └────┬─────┘  └────┬─────┘   └─────┬─────┘  └─────┬──────┘
        │              │ 1          *│ 1          *│              ▲ *            ▲ *
        │              └─────────────┘             │              │              │
        │                                          │ recipeRef    │ components   │ components
        │ 1                                  ┌──────┴──────────────┴──────────────┘
        │                                    │  (recipe yields a menu item OR a prepared ingredient;
        │                                    │   recipe components reference raw + prepared ingredients)
        │                                    │
        │ *                                  │
   ┌────▼─────────┐                    ┌─────▼──────────┐         ┌──────────────┐
   │ ORDER        │ * ───────────────► │  MENU (item)   │         │  INVENTORY   │
   │ active/hist  │   line.menuItemId  └────────────────┘         │  (per item)  │
   └────┬─────────┘                                               └──────┬───────┘
        │ 1                                                              │ 1
        │ * (consumes via recipe explosion → stock movements)           │ *
        │                                                         ┌──────▼─────────┐
        │                                                         │ STOCK_MOVEMENT │ (ledger)
   ┌────▼─────────┐        ┌──────────────┐                       └──────┬─────────┘
   │ DINEIN_SESS  │ 1───*  │  ORDER       │                              ▲
   │ (per table)  │        └──────────────┘                              │ source: PO receipt
   └────┬─────────┘                                                      │
        │ 1                                                       ┌───────┴────────┐
        │ * (one table → sessions over time)                     │ PURCHASE_ORDER │ * ──┐
   ┌────▼─────┐        ┌──────────┐                               └───────┬────────┘     │ line.ingredientRef
   │  TABLE   │ 1───*  │  QR_CODE │                                       │ *            │
   └──────────┘        └──────────┘                                  ┌────▼─────┐  ◄─────┘
                                                                     │  VENDOR  │
   ┌──────────────┐   ┌─────────────────┐                           └──────────┘
   │ PREP_LINE    │1─*│  PREP_TASK      │ * ──► RECIPE (prepared ingredient batch to make)
   │ (station)    │   │ (daily board)   │ * ──► PREP_INGR
   └──────────────┘   └─────────────────┘

   ┌──────────────┐   ┌──────────────────────┐      ┌────────────────┐
   │ LOYALTY_ACCT │1─*│ LOYALTY_TRANSACTION  │      │ REWARD_CATALOG │
   │ (on USER)    │   │ (ledger)             │ ───► │  (redeemable)  │
   └──────────────┘   └──────────────────────┘      └────────────────┘
        ▲ 1:1 USER

   ┌──────────────────────────────────────────────────────────────────────┐
   │ ANALYTICS (read-only rollups, written by Functions)                    │
   │  analyticsDaily ◄ orders, analyticsMenuItem ◄ orders,                  │
   │  inventoryValuation ◄ stock_movements, foodCost ◄ recipes+movements    │
   └──────────────────────────────────────────────────────────────────────┘
```

### Key cardinalities & rules

- **Provider 1—\* everything.** Hard tenant boundary via path.
- **MenuCategory 1—\* Menu.** A menu item belongs to exactly one category (`categoryId`), but may also carry `tags[]` for cross-cut filtering.
- **Menu \*—1 Recipe.** A sellable menu item references one production recipe (`recipeRef`). A recipe may exist without a menu item (sub-recipe for a prepared ingredient).
- **Recipe \*—\* Ingredient (raw + prepared).** Modeled via the embedded `components[]` array (bounded; a recipe rarely exceeds ~40 components). Each component points to a raw or prepared ingredient.
- **PreparedIngredient \*—1 Recipe.** A prepared ingredient *is produced by* a recipe (its `producedByRecipeRef`) and *is consumed by* other recipes. This is the recursive node that enables a Bill-of-Materials explosion.
- **Order \*—\* Menu** via embedded `items[]` (frozen shape). On fulfillment, an order *explodes* through recipes into **StockMovement** ledger entries (out-flows).
- **Inventory 1—1 Ingredient**, **Inventory 1—\* StockMovement** (append-only ledger). Current quantity is a denormalized cache reconciled from the ledger.
- **PurchaseOrder \*—1 Vendor**, **PO 1—\* line items** (embedded). Receiving a PO writes **StockMovement** in-flows.
- **Table 1—\* DineInSession** (over time), **Table 1—\* QrCode** (a table can have multiple QR placements). **DineInSession 1—\* Order**.
- **PrepLine 1—\* PrepTask**; each PrepTask targets a prepared-ingredient batch (a recipe to execute).
- **User 1—1 LoyaltyAccount** (embedded sub-doc + ledger), **LoyaltyAccount 1—\* LoyaltyTransaction** (ledger).

---

## 3. Firestore Collection Tree

Single source of truth for paths. `{var}` = document id.

```
/userIndex/{uid}                         ← global uid → provider/role lookup (cross-tenant)
/providerDirectory/{providerId}          ← public provider discovery (name, slug, status)

/providers/{providerId}                  ← TENANT ROOT (config document)
│
├── /users/{uid}                         ← EXISTING (extended)
│
├── /menuCategories/{categoryId}
├── /menu/{menuItemId}                    ← EXISTING (extended: recipeRef, modifiers, stationId)
│   └── /modifierGroups/{groupId}         ← optional: large modifier sets as subcollection
│
├── /recipes/{recipeId}                   ← yields a menu item OR a prepared ingredient
│
├── /rawIngredients/{ingredientId}
├── /preparedIngredients/{prepId}
│
├── /inventory/{itemId}                   ← itemId === rawIngredientId | preparedIngredientId
│   └── /stockMovements/{movementId}      ← append-only ledger (in/out/adjust/waste)
│
├── /vendors/{vendorId}
│   └── /priceList/{ingredientId}         ← vendor-specific pricing & pack sizes
│
├── /purchaseOrders/{poId}                ← line items embedded
│
├── /prepLines/{lineId}                   ← kitchen station definition
├── /prepTasks/{taskId}                   ← daily prep board entries (hot; archived nightly)
│
├── /tables/{tableId}
│   └── /sessions/{sessionId}             ← dine-in session per seating
├── /qrCodes/{qrId}                       ← resolves to a table (or pickup/online channel)
│
├── /orders_active/{orderId}              ← EXISTING (extended: channel, tableId, sessionId, loyalty)
├── /orders_history/{orderId}             ← EXISTING (extended)
│
├── /loyaltyAccounts/{uid}                ← 1:1 with user (denormalized balance)
│   └── /transactions/{txnId}             ← append-only points ledger
├── /rewardCatalog/{rewardId}             ← redeemable rewards
│
├── /counters/{counterId}                 ← distributed counters / human-readable order numbers
│
└── /analytics
    ├── /daily/{YYYY-MM-DD}               ← sales/ops rollup per day
    ├── /menuItems/{menuItemId}           ← per-item lifetime + trailing rollups
    ├── /inventoryValuation/{YYYY-MM-DD}  ← stock-on-hand value snapshot
    └── /events/{eventId}                 ← raw analytics event stream → BigQuery export
```

### Hot vs. cold collection policy

| Collection | Churn | Strategy |
|---|---|---|
| `orders_active` | very high | Hot. Keep small (live orders only). Delete-on-complete → `orders_history`. *(existing pattern, preserved)* |
| `orders_history` | append-only | Cold. Indexed for reporting. Partition-by-month optional at scale (`orders_history_YYYYMM`). |
| `prepTasks` | high (daily) | Hot. Nightly Function archives completed tasks to `analytics/events` and deletes. |
| `inventory/{}/stockMovements` | high | Append-only ledger; never updated. Periodic compaction snapshot in `inventory` doc. |
| `loyaltyAccounts/{}/transactions` | medium | Append-only ledger. |
| `menu`, `recipes`, `vendors`, `tables` | low | Standard mutable docs. |

---

## 4. Document Schemas & JSON Examples

All timestamps are Firestore `Timestamp` (written via `serverTimestamp()`). Money is stored as **integer minor units** (e.g. cents) in new collections to avoid float drift — `[PRD-TBD]` currency. The existing order `pricing` uses plain numbers; we keep that shape for compatibility but document the convention for everything new.

### 4.1 Global lookup & provider root

```jsonc
// /userIndex/{uid}  — lets a freshly-authenticated user find their tenant before any provider read
{
  "uid": "auth_abc123",
  "providerId": "jhigucocina",
  "role": "manager",
  "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{providerId}  — tenant configuration document
{
  "providerId": "jhigucocina",
  "name": "Jhigu Cocina",
  "slug": "jhigu-cocina",
  "status": "active",                       // active | suspended | onboarding
  "locale": { "currency": "USD", "timezone": "America/Los_Angeles", "language": "en" },
  "tax": { "model": "exclusive", "defaultRatePct": 8.5 },     // [PRD-TBD]
  "service": {
    "channels": ["dine_in", "qr", "pickup"],                  // enabled ordering channels
    "dineInEnabled": true,
    "qrOrderingEnabled": true
  },
  "loyalty": { "enabled": true, "earnRatePointsPerCurrency": 1, "redeemValuePerPoint": 0.01 }, // [PRD-TBD]
  "branding": { "logoUrl": "gs://.../logo.png", "primaryColor": "#B5121B" },
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

### 4.2 User (extended — compatible with `AuthContext.jsx`)

```jsonc
// /providers/{pid}/users/{uid}
{
  "uid": "auth_abc123",                     // EXISTING
  "email": "ana@example.com",               // EXISTING
  "role": "customer",                       // EXISTING (customer|staff|manager|admin)
  "providerId": "jhigucocina",              // EXISTING
  "createdAt": "<ts>",                      // EXISTING
  // --- additive ---
  "displayName": "Ana R.",
  "phone": "+15555550123",
  "photoUrl": null,
  "status": "active",                       // active | disabled
  "staff": {                                // present only for staff/manager/admin
    "assignedStationIds": ["grill", "cold"],
    "pin": null                             // hashed PIN for POS terminal, never plaintext
  },
  "loyaltySummary": { "tier": "silver", "pointsBalance": 320 },  // denormalized cache of loyaltyAccounts
  "updatedAt": "<ts>"
}
```

### 4.3 Menu category & menu item (extended — compatible with `menuService.js`)

```jsonc
// /providers/{pid}/menuCategories/{categoryId}
{
  "name": "Tacos",
  "slug": "tacos",
  "sortOrder": 10,
  "active": true,
  "availability": { "alwaysAvailable": true, "schedule": null },  // dayparting [PRD-TBD]
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/menu/{menuItemId}   — EXISTING shape preserved, fields added
{
  "name": "Al Pastor Taco",                 // EXISTING
  "price": 4.50,                            // EXISTING (kept as number for compat)
  "available": true,                        // EXISTING (manual 86 toggle)
  "createdAt": "<ts>",                      // EXISTING
  "updatedAt": "<ts>",                      // EXISTING
  // --- additive ---
  "description": "Marinated pork, pineapple, cilantro",
  "categoryId": "cat_tacos",
  "imageUrl": "gs://.../alpastor.png",
  "tags": ["pork", "spicy", "popular"],
  "stationId": "grill",                     // routes to a kitchen prep line / KDS lane
  "recipeRef": "providers/jhigucocina/recipes/rec_alpastor",  // source of truth for cost & inventory
  "priceMinor": 450,                        // integer convention for new pricing logic
  "modifierGroupIds": ["mg_salsa", "mg_extra"],
  "dietary": { "vegetarian": false, "vegan": false, "glutenFree": true },
  "availabilityComputed": {                 // written by inventory Function
    "inStock": true,
    "limitingIngredientId": null,
    "maxSellableQty": 38                    // min over recipe components
  },
  "sortOrder": 10,
  "stats": { "lifetimeSold": 12044, "trailing30Sold": 410 }    // denormalized analytics cache
}
```

```jsonc
// /providers/{pid}/menu/{menuItemId}/modifierGroups/{groupId}  (optional; for large sets)
{
  "name": "Choose your salsa",
  "min": 0, "max": 2, "required": false,
  "options": [
    { "id": "opt_verde", "name": "Salsa Verde", "priceDeltaMinor": 0,   "recipeComponentRef": "prep_salsa_verde" },
    { "id": "opt_roja",  "name": "Salsa Roja",  "priceDeltaMinor": 0,   "recipeComponentRef": "prep_salsa_roja" },
    { "id": "opt_extra_meat", "name": "Extra Pastor", "priceDeltaMinor": 150, "recipeComponentRef": "prep_pastor" }
  ],
  "updatedAt": "<ts>"
}
```

### 4.4 Recipe (the BOM core)

```jsonc
// /providers/{pid}/recipes/{recipeId}
{
  "name": "Al Pastor Taco (plated)",
  "type": "menu_item",                      // menu_item | prepared_ingredient
  "yields": { " qtyValue": 1, "unit": "each" },   // one plated taco
  "producesRef": "providers/jhigucocina/menu/menu_alpastor",   // or preparedIngredients/{id}
  "components": [                            // bounded array (BOM lines)
    { "kind": "prepared", "ref": "preparedIngredients/prep_pastor",  "qtyValue": 80,  "unit": "g" },
    { "kind": "prepared", "ref": "preparedIngredients/prep_tortilla","qtyValue": 1,   "unit": "each" },
    { "kind": "raw",      "ref": "rawIngredients/ing_cilantro",      "qtyValue": 5,   "unit": "g" },
    { "kind": "raw",      "ref": "rawIngredients/ing_pineapple",     "qtyValue": 15,  "unit": "g" }
  ],
  "steps": ["Warm tortilla", "Add pastor", "Top with pineapple + cilantro"],
  "costCache": { "totalCostMinor": 92, "computedAt": "<ts>" },   // rolled-up food cost, written by Function
  "version": 4,                             // bumped on edit; movements record version used
  "active": true,
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

### 4.5 Raw & prepared ingredients

```jsonc
// /providers/{pid}/rawIngredients/{ingredientId}
{
  "name": "Cilantro",
  "category": "produce",
  "baseUnit": "g",                          // canonical stock-keeping unit
  "purchaseUnit": "bunch",
  "conversion": { "purchaseToBase": 30 },   // 1 bunch = 30 g
  "preferredVendorId": "vendor_fresh",
  "costCache": { "perBaseUnitMinor": 1, "computedAt": "<ts>" },  // moving avg cost / base unit
  "reorder": { "parLevel": 1500, "reorderPoint": 500, "reorderQty": 3000 },  // [PRD-TBD] in base units
  "allergens": [],
  "active": true,
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/preparedIngredients/{prepId}  — mise-en-place / sub-recipe output
{
  "name": "Pastor (marinated, cooked)",
  "baseUnit": "g",
  "producedByRecipeRef": "providers/jhigucocina/recipes/rec_pastor_batch",
  "shelfLifeHours": 48,
  "costCache": { "perBaseUnitMinor": 3, "computedAt": "<ts>" },  // derived from its recipe explosion
  "stationId": "grill",
  "active": true,
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

### 4.6 Inventory & stock-movement ledger

```jsonc
// /providers/{pid}/inventory/{itemId}      itemId = rawIngredientId or preparedIngredientId
{
  "itemId": "ing_cilantro",
  "itemKind": "raw",                        // raw | prepared
  "baseUnit": "g",
  "onHand": 820,                            // DENORMALIZED cache, reconciled from ledger
  "reserved": 0,                            // soft-allocated to open orders/prep tasks
  "available": 820,                         // onHand - reserved
  "valuationMinor": 820,                    // onHand * moving-avg cost
  "lastCountedAt": "<ts>",                  // last physical count
  "lastMovementAt": "<ts>",
  "lowStock": false,                        // onHand <= reorderPoint (mirrored from ingredient)
  "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/inventory/{itemId}/stockMovements/{movementId}  — APPEND-ONLY, immutable
{
  "type": "out",                            // in | out | adjust | waste | count | transfer
  "qtyBase": -5,                            // signed, in base units
  "balanceAfter": 815,                      // running balance snapshot for audit
  "unitCostMinor": 1,
  "source": {
    "kind": "order_fulfillment",            // po_receipt | order_fulfillment | prep_consume |
                                            // prep_produce | manual_adjust | waste | physical_count
    "ref": "providers/jhigucocina/orders_active/ord_991",
    "recipeVersion": 4
  },
  "actorUid": "auth_staff7",
  "note": null,
  "createdAt": "<ts>"
}
```

> **Why a ledger:** food cost, theoretical-vs-actual usage, and waste reporting all require an immutable history. The `inventory` doc is a fast cache; the ledger is the truth. A nightly Function reconciles cache against `sum(qtyBase)`.

### 4.7 Vendor & purchase order

```jsonc
// /providers/{pid}/vendors/{vendorId}
{
  "name": "Fresh Produce Co.",
  "contact": { "email": "orders@freshco.com", "phone": "+15555551000" },
  "terms": { "paymentDays": 30, "minimumOrderMinor": 5000 },
  "leadTimeDays": 2,
  "active": true,
  "stats": { "openPoCount": 1, "trailing90SpendMinor": 184500 },  // denormalized
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/vendors/{vendorId}/priceList/{ingredientId}
{
  "ingredientId": "ing_cilantro",
  "vendorSku": "CIL-30",
  "packDescription": "Case of 24 bunches",
  "packToBase": 720,                        // 24 bunches * 30 g
  "packPriceMinor": 1440,
  "perBaseUnitMinor": 2,
  "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/purchaseOrders/{poId}
{
  "poNumber": "PO-2026-0042",               // human-readable, from /counters
  "vendorId": "vendor_fresh",
  "vendorName": "Fresh Produce Co.",        // denormalized for list views
  "status": "submitted",                    // draft | submitted | partial | received | cancelled
  "lines": [                                // embedded; a PO rarely exceeds a few dozen lines
    {
      "ingredientId": "ing_cilantro", "name": "Cilantro",
      "orderedPacks": 2, "packToBase": 720,
      "orderedBase": 1440, "receivedBase": 0,
      "unitPriceMinor": 1440, "lineTotalMinor": 2880
    }
  ],
  "totals": { "subtotalMinor": 2880, "taxMinor": 0, "totalMinor": 2880 },
  "expectedDate": "<ts>",
  "timeline": { "createdAt": "<ts>", "submittedAt": "<ts>", "receivedAt": null, "updatedAt": "<ts>" },
  "events": [ { "type": "PO_SUBMITTED", "by": "manager", "ts": "<ms>" } ],  // mirrors order audit style
  "createdByUid": "auth_mgr1"
}
```

> **Receiving flow:** marking a PO line received writes `stockMovements` of `type:"in"` and updates the moving-average cost on the ingredient — all inside a transaction/Function so cost and quantity stay consistent.

### 4.8 Kitchen prep lines & prep tasks

```jsonc
// /providers/{pid}/prepLines/{lineId}      — station definition (KDS lane)
{
  "name": "Grill",
  "code": "grill",
  "type": "cook",                           // cook | cold | assembly | bar | expo
  "sortOrder": 1,
  "active": true,
  "routesMenuTags": ["grill"],              // helps auto-route order items to this lane
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/prepTasks/{taskId}      — daily prep board (hot; archived nightly)
{
  "lineId": "grill",
  "date": "2026-06-05",                     // local business day for board filtering
  "target": {                              // what to make
    "kind": "prepared_ingredient",
    "prepId": "prep_pastor",
    "recipeRef": "providers/jhigucocina/recipes/rec_pastor_batch",
    "batchQtyBase": 5000, "unit": "g"
  },
  "status": "in_progress",                  // todo | in_progress | done | cancelled
  "priority": 2,
  "assignedToUid": "auth_staff7",
  "consumesReserved": true,                 // reserves raw components in inventory while in progress
  "timeline": { "createdAt": "<ts>", "startedAt": "<ts>", "doneAt": null, "updatedAt": "<ts>" },
  "producedMovementId": null                // set when 'done' → creates prep_produce stock movement
}
```

### 4.9 Tables, QR codes, dine-in sessions

```jsonc
// /providers/{pid}/tables/{tableId}
{
  "label": "T12",
  "zone": "patio",
  "seats": 4,
  "status": "occupied",                     // free | occupied | reserved | dirty
  "activeSessionId": "sess_77",             // null when free
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/qrCodes/{qrId}          — printed code resolves to a channel/table
{
  "channel": "dine_in",                     // dine_in | pickup | online
  "tableId": "table_12",                    // null for non-table channels
  "active": true,
  "shortCode": "JC-T12",                    // what's encoded in the QR URL
  "scanCount": 1840,                        // denormalized analytics cache
  "createdAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/tables/{tableId}/sessions/{sessionId}   — one seating
{
  "tableId": "table_12",
  "status": "open",                         // open | bill_requested | closed
  "openedByUid": "auth_staff7",             // or null if customer self-opened via QR
  "guestCount": 3,
  "orderIds": ["ord_991", "ord_994"],       // bounded for a single seating
  "totals": { "subtotalMinor": 5400, "taxMinor": 459, "totalMinor": 5859 },
  "payment": { "status": "unpaid", "method": null },   // unpaid | paid | comped
  "openedAt": "<ts>", "closedAt": null, "updatedAt": "<ts>"
}
```

### 4.10 Order (extended — `orderService.js` shape FROZEN, fields added)

```jsonc
// /providers/{pid}/orders_active/{orderId}     (same shape flows to orders_history)
{
  "providerId": "jhigucocina",              // EXISTING
  "customerId": "auth_abc123",              // EXISTING (nullable for anonymous QR)
  "items": [                                // EXISTING shape preserved
    {
      "menuItemId": "menu_alpastor", "name": "Al Pastor Taco",
      "price": 4.50, "quantity": 3, "subtotal": 13.50,
      // --- additive per-line ---
      "stationId": "grill",
      "modifiers": [ { "groupId": "mg_salsa", "optionId": "opt_verde", "priceDelta": 0 } ],
      "lineStatus": "preparing",            // per-item KDS status (optional, additive)
      "notes": "no onion"
    }
  ],
  "pricing": {                              // EXISTING shape preserved
    "subtotal": 13.50, "tax": 1.15, "discount": 0, "total": 14.65,
    "loyaltyPointsRedeemed": 0, "loyaltyDiscountMinor": 0   // additive
  },
  "status": "preparing",                    // EXISTING state machine
  "timeline": {                             // EXISTING
    "placedAt": "<ts>", "acceptedAt": "<ts>", "startedPreparingAt": "<ts>",
    "readyAt": null, "completedAt": null, "updatedAt": "<ts>"
  },
  "events": [                               // EXISTING audit array
    { "type": "ORDER_PLACED", "timestamp": 1749100000000, "by": "customer" },
    { "type": "ORDER_ACCEPTED", "timestamp": 1749100060000, "by": "staff" }
  ],
  // --- additive: channel / dine-in / QR / loyalty ---
  "channel": "qr",                          // dine_in | qr | pickup | online
  "tableId": "table_12",                    // null unless dine-in/QR-at-table
  "sessionId": "sess_77",                   // links to dine-in session
  "orderNumber": "A-0142",                  // human-readable, from /counters
  "loyalty": { "accountUid": "auth_abc123", "pointsToEarn": 14, "applied": false },
  "fulfillment": { "inventoryExploded": false }   // set true once stock movements written (idempotency)
}
```

> The new `cancelled`/`void` branch extends `ORDER_FLOW` only as an *additive* terminal transition guarded by manager role; the existing strict forward machine is unchanged.

### 4.11 Loyalty

```jsonc
// /providers/{pid}/loyaltyAccounts/{uid}   — 1:1 with user
{
  "uid": "auth_abc123",
  "pointsBalance": 320,                     // DENORMALIZED cache, reconciled from ledger
  "lifetimePointsEarned": 1840,
  "lifetimePointsRedeemed": 1520,
  "tier": "silver",                         // bronze | silver | gold  [PRD-TBD thresholds]
  "tierProgress": { "toNext": "gold", "pointsNeeded": 680 },
  "updatedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/loyaltyAccounts/{uid}/transactions/{txnId}  — APPEND-ONLY ledger
{
  "type": "earn",                           // earn | redeem | adjust | expire
  "points": 14,                             // signed
  "balanceAfter": 334,
  "source": { "kind": "order", "ref": "providers/jhigucocina/orders_history/ord_991" },
  "rewardId": null,                         // set on redeem
  "actorUid": "auth_abc123",
  "createdAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/rewardCatalog/{rewardId}
{
  "name": "Free Taco",
  "costPoints": 200,
  "type": "free_item",                      // free_item | percent_off | amount_off
  "value": { "menuItemId": "menu_alpastor" },
  "active": true,
  "createdAt": "<ts>", "updatedAt": "<ts>"
}
```

### 4.12 Counters (human-readable sequences)

```jsonc
// /providers/{pid}/counters/{counterId}     e.g. "orders-2026-06-05", "po-2026"
{
  "scope": "orders",
  "period": "2026-06-05",
  "value": 142,
  "shards": null,                           // optional sharded counter for very high throughput
  "updatedAt": "<ts>"
}
```

### 4.13 Analytics rollups (read-only; written by Functions)

```jsonc
// /providers/{pid}/analytics/daily/{YYYY-MM-DD}
{
  "date": "2026-06-05",
  "orders": { "count": 142, "completed": 138, "cancelled": 4 },
  "revenueMinor": { "gross": 184500, "tax": 15682, "discounts": 4200, "net": 164618 },
  "byChannel": { "dine_in": 60, "qr": 70, "pickup": 12 },
  "avgTicketMinor": 1300,
  "avgPrepSeconds": 540,
  "foodCostMinor": 51000,
  "foodCostPct": 27.6,
  "loyalty": { "pointsEarned": 1820, "pointsRedeemed": 600 },
  "computedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/analytics/menuItems/{menuItemId}
{
  "menuItemId": "menu_alpastor",
  "lifetime": { "qtySold": 12044, "revenueMinor": 5419800 },
  "trailing30": { "qtySold": 410, "revenueMinor": 184500 },
  "marginPct": 79.6,
  "rank30": 1,
  "computedAt": "<ts>"
}
```

```jsonc
// /providers/{pid}/analytics/events/{eventId}   — raw stream, exported to BigQuery
{
  "type": "order_completed",
  "ts": "<ts>",
  "payload": { "orderId": "ord_991", "channel": "qr", "totalMinor": 1465 },
  "exported": false
}
```

---

## 5. Required Composite Indexes

Single-field indexes are automatic. Below are the **composite** indexes required by the query patterns above. (`↑/↓` = asc/desc; collection-group indexes flagged.)

| # | Collection (path) | Fields (ordered) | Serves |
|---|---|---|---|
| 1 | `orders_active` | `customerId ↑`, `timeline.placedAt ↓` | **EXISTING** `getUserOrders` / `subscribeToUserOrders` (`orderService.js`). |
| 2 | `orders_history` | `customerId ↑`, `timeline.placedAt ↓` | **EXISTING** `getUserOrderHistory`. |
| 3 | `orders_active` | `status ↑`, `timeline.placedAt ↑` | KDS board ordered by age, filtered by status. |
| 4 | `orders_active` | `channel ↑`, `status ↑`, `timeline.placedAt ↑` | Channel-specific live boards (QR vs dine-in). |
| 5 | `orders_active` | `stationId ↑`, `status ↑`, `timeline.placedAt ↑` | Per-station KDS lane (requires `stationId` denormalized to order or per-item collection-group). |
| 6 | `orders_history` | `channel ↑`, `timeline.completedAt ↓` | Channel reporting. |
| 7 | `orders_history` | `status ↑`, `timeline.completedAt ↓` | Cancelled/void reporting. |
| 8 | `menu` | `categoryId ↑`, `available ↑`, `sortOrder ↑` | Customer menu render by category. |
| 9 | `menu` | `available ↑`, `tags ↑` (array-contains) , `sortOrder ↑` | Tag/filter browsing. |
| 10 | `purchaseOrders` | `status ↑`, `timeline.createdAt ↓` | Open-PO management list. |
| 11 | `purchaseOrders` | `vendorId ↑`, `timeline.createdAt ↓` | Vendor purchase history. |
| 12 | `prepTasks` | `lineId ↑`, `date ↑`, `status ↑`, `priority ↑` | Per-station daily prep board. |
| 13 | `prepTasks` | `date ↑`, `status ↑` | All-station prep overview. |
| 14 | `inventory` | `lowStock ↑`, `itemKind ↑` | Reorder dashboard / low-stock alerts. |
| 15 | `stockMovements` (group) | `source.kind ↑`, `createdAt ↓` | **Collection-group** usage reports across all items. |
| 16 | `stockMovements` (per item) | `type ↑`, `createdAt ↓` | Per-ingredient movement history. |
| 17 | `tables` | `status ↑`, `zone ↑` | Floor map / host view. |
| 18 | `sessions` (group) | `status ↑`, `openedAt ↓` | **Collection-group** open dine-in sessions across tables. |
| 19 | `transactions` (group) | `type ↑`, `createdAt ↓` | **Collection-group** loyalty reporting. |
| 20 | `vendors` | `active ↑`, `name ↑` | Vendor picker. |
| 21 | `analytics/events` | `exported ↑`, `ts ↑` | BigQuery export batch selection. |
| 22 | `recipes` | `type ↑`, `active ↑` | Recipe library filtered by menu-item vs prep. |

**Collection-group indexes** (#15, #18, #19) must be explicitly declared because they query a subcollection name across all parents. They are the mechanism that lets managers run cross-item / cross-table reports without fan-out reads.

**Index hygiene:** ship these in `firestore.indexes.json` (deployed via `firebase deploy --only firestore:indexes`) so they are version-controlled and reproducible across environments.

---

## 6. Security Rule Strategy

The model is **defense in depth**: structural tenant isolation (path) + custom-claim-based authorization (rules) + Function-only write surfaces for sensitive ledgers.

### 6.1 Identity & claims

- On user creation / role change, a Cloud Function sets **Auth custom claims** `{ providerId, role }`. This makes `request.auth.token.providerId` and `request.auth.token.role` available in rules **without an extra Firestore read** — essential because the existing app already reads role from the user doc; claims make rule checks O(1).
- `/userIndex/{uid}` is the bootstrap lookup a client uses *before* claims are known (e.g. first login), readable only by the owning uid.

### 6.2 Core helper predicates (strategy, not final code)

```
function signedIn()      => request.auth != null;
function claims()        => request.auth.token;
function sameProvider(p) => signedIn() && claims().providerId == p;
function hasRole(p, r)   => sameProvider(p) && claims().role == r;
function isStaffPlus(p)  => sameProvider(p) && claims().role in ['staff','manager','admin'];
function isMgrPlus(p)    => sameProvider(p) && claims().role in ['manager','admin'];
function isAdmin(p)      => hasRole(p, 'admin');
```

### 6.3 Per-domain access matrix

| Path | Read | Create | Update | Delete |
|---|---|---|---|---|
| `providers/{p}` | any signed-in same-provider | admin | admin | ✗ |
| `providers/{p}/users/{uid}` | self **or** isMgrPlus | self (role forced `customer`) | self (non-role fields) **or** isMgrPlus (role) | admin |
| `menuCategories`, `menu`, `menu/.../modifierGroups` | public-readable (same provider; menu may be world-readable for QR) | isMgrPlus | isMgrPlus | isMgrPlus |
| `recipes`, `rawIngredients`, `preparedIngredients` | isStaffPlus | isMgrPlus | isMgrPlus | isMgrPlus |
| `inventory/{item}` | isStaffPlus | **Function only** | **Function only** (reconciled) | ✗ |
| `inventory/.../stockMovements` | isStaffPlus | **Function only** (append-only) | ✗ (immutable) | ✗ |
| `vendors`, `vendors/.../priceList` | isStaffPlus | isMgrPlus | isMgrPlus | isMgrPlus |
| `purchaseOrders` | isStaffPlus | isMgrPlus | isMgrPlus (status transitions validated) | manager (draft only) |
| `prepLines` | isStaffPlus | isMgrPlus | isMgrPlus | isMgrPlus |
| `prepTasks` | isStaffPlus | isStaffPlus | isStaffPlus (own/assigned status) | isMgrPlus |
| `tables`, `tables/.../sessions` | isStaffPlus (+ QR guest read of own session) | isStaffPlus | isStaffPlus | isMgrPlus |
| `qrCodes` | public (resolve code → channel) | isMgrPlus | isMgrPlus | isMgrPlus |
| `orders_active` | self (own `customerId`) **or** isStaffPlus | self **or** staff (QR/anon allowed if channel=qr) | **status transitions: Function/staff only**; customer may not mutate after place | ✗ (moves to history via Function) |
| `orders_history` | self **or** isStaffPlus | **Function only** | ✗ | admin |
| `loyaltyAccounts/{uid}` | self **or** isStaffPlus | **Function only** | **Function only** | ✗ |
| `loyaltyAccounts/.../transactions` | self **or** isStaffPlus | **Function only** (append-only) | ✗ | ✗ |
| `rewardCatalog` | public (same provider) | isMgrPlus | isMgrPlus | isMgrPlus |
| `counters` | ✗ (clients never read) | **Function only** | **Function only** | ✗ |
| `analytics/**` | isMgrPlus | **Function only** | **Function only** | ✗ |

### 6.4 Strategy rules / invariants enforced in rules

1. **Tenant pinning:** every rule begins by asserting `sameProvider(p)` where `p` is the `{providerId}` path segment. A token for tenant A can never touch tenant B even if it guesses an id. The existing services already pass `providerId` into every path, so no client change is required.
2. **Role escalation prevention:** on `users` update, a customer may write profile fields but the rule rejects any write that changes `role`/`providerId` unless `isMgrPlus`. This protects the `role` field that `AuthContext.jsx` trusts.
3. **Order integrity:** customers can *create* an order (matching the existing `createOrder`) and read their own, but **cannot** change `status`, `pricing`, or `timeline` — those transitions are the province of staff/Functions, enforcing the `canTransitionTo` machine server-side. This closes the gap where the current client-side state machine could otherwise be bypassed.
4. **Ledgers are append-only and Function-written.** `stockMovements`, loyalty `transactions`, `orders_history`, `counters`, and all `analytics` are **not client-writable**. Clients trigger Callable/HTTPS Functions (or the Function reacts to an order/PO/prep-task trigger); the Function performs the transactional fan-out. This guarantees that money and inventory can never be corrupted from the browser.
5. **Immutability:** movement/transaction documents reject all `update`/`delete` (`allow update, delete: if false`). Corrections are *new compensating entries*, never edits.
6. **QR / anonymous ordering:** `qrCodes` and `menu` are public-readable so an unauthenticated guest can scan and browse. Placing a QR order either requires Firebase **anonymous auth** (preferred — gives a stable uid for the session) or a Function that validates the `shortCode` and writes the order server-side. Anonymous orders carry `customerId: null` + `sessionId`.
7. **Emulator-tested:** the rule suite ships with a `@firebase/rules-unit-testing` suite as the regression gate before any deploy.

### 6.5 Where logic must live in Cloud Functions (not rules, not client)

Rules can authorize but cannot do multi-document transactions or math. These belong in Functions:

- **Order fulfillment → inventory explosion:** on `status:"completed"` (or `ready`, `[PRD-TBD]`), explode each line through its recipe BOM (recursively through prepared ingredients) and write `out` stock movements + update caches. Guarded by `fulfillment.inventoryExploded` for idempotency.
- **PO receiving → stock-in + moving-average cost recompute.**
- **Prep task done → `prep_produce` (in) + `prep_consume` (out) movements.**
- **Loyalty accrual/redemption** on order completion.
- **Counter allocation** for human-readable order/PO numbers.
- **Recipe cost roll-up** (recursive) when ingredient cost or recipe components change.
- **Analytics rollups** on order/movement triggers + nightly recompute, plus BigQuery export of `analytics/events`.
- **Custom-claim sync** on user role change.
- **Nightly maintenance:** archive `prepTasks`, reconcile inventory caches vs ledger, recompute `menu.availabilityComputed.maxSellableQty`.

---

## 7. Compatibility & Migration Notes

| Concern | Resolution |
|---|---|
| Existing services hardcode the 4 paths (`users`, `menu`, `orders_active`, `orders_history`) | All preserved verbatim. New collections are siblings; existing services need **zero changes** to keep working. |
| Existing `menu` docs lack `categoryId`, `recipeRef`, etc. | All new fields are **optional**. A one-time backfill assigns an "Uncategorized" category and null recipe; menu management continues to function before backfill. |
| Existing order `pricing` uses float numbers | Kept as-is for compatibility. New financial logic uses parallel `*Minor` integer fields; a Function can derive them. No breaking change to `createOrder`. |
| Role currently read from Firestore user doc | Continue to support that path; **additively** introduce custom claims. `AuthContext.jsx` can keep reading the doc; rules use claims. Both stay in sync via the role-change Function. |
| `DEFAULT_PROVIDER_ID` single-tenant today | Multi-tenant structure already present in paths; going multi-tenant is now a configuration/onboarding concern, not a schema migration. |

**Migration sequence (no downtime):** (1) deploy indexes + rules (backward-compatible), (2) deploy Functions (claims sync, fulfillment) in shadow/idempotent mode, (3) backfill `menuCategories` + `categoryId`, (4) backfill `recipes`/ingredients/inventory, (5) enable inventory explosion + loyalty, (6) enable analytics rollups.

---

## 8. Open Questions for PRD (`[PRD-TBD]`)

1. Currency, tax model (inclusive vs exclusive), and rounding rules.
2. Loyalty: earn rate, redemption value, tier thresholds, point expiry.
3. Reorder policy: who approves auto-generated POs; par/reorder defaults per ingredient class.
4. Inventory decrement trigger point: at `ready`, at `completed`, or at item-line completion?
5. QR ordering: anonymous-auth vs Function-mediated; does a QR order require payment up front?
6. Dine-in payment: integrated payment provider or external POS reconciliation?
7. Data retention for `orders_history` and `analytics/events` (drives month-partitioning decision).
8. Multi-location: is a "provider" a brand or a single physical location? (Affects whether `tables`/`inventory` need a `locationId` axis.)

---

*End of architecture document. No implementation code included by design; the next deliverable would be `firestore.rules`, `firestore.indexes.json`, and the Cloud Functions skeletons derived from §5–§6.*
