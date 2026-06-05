# Document C — JhiguCocina Workflow Architecture

**Status:** Design only (no implementation code)
**Date:** 2026-06-05
**Companion to:** `docs/firestore-architecture.md`, `docs/A-frontend-architecture.md`, `docs/B-design-system.md`
**Scope:** Every business state machine in the product, with diagrams, allowed transitions, trigger sources, and Cloud Function ownership.

> **Authority model (applies to all machines).** Per the security strategy in the architecture doc, **all sensitive transitions are server-authoritative**. The client may *request* a transition (drag a KDS card, click "Receive"), but the canonical state change — and any side-effect fan-out (inventory movements, loyalty points, cost recompute) — is executed and validated by a Cloud Function inside a transaction. The existing `canTransitionTo` guard in `orderService.js` is the pattern; it is enforced on the server, not just the client. Illegal transitions are rejected and the optimistic UI snaps back.
>
> **Conventions used below:**
> - **Trigger source** = who/what initiates (Customer · Staff · Manager · System/scheduled · Function-reaction).
> - **CF owner** = the Cloud Function that owns the transition and its side effects.
> - All side-effect writes are **idempotent** (guarded by a flag like `fulfillment.inventoryExploded`) so retries can't double-apply.
> - Status colors reference the shared status tokens in Document B §2.3.

---

## 0. State Machine Inventory & Ownership Map

| # | Machine | Doc(s) | Hot collection | Owning Function(s) |
|---|---|---|---|---|
| 1 | Order lifecycle | `orders_active` → `orders_history` | yes | `fnOrderTransition`, `fnOrderFulfill` |
| 2 | Order-item lifecycle | `orders_active.items[].lineStatus` | yes | `fnOrderItemTransition` (delegates to #1) |
| 3 | Inventory (stock item) | `inventory/{item}` + `stockMovements` | yes | `fnStockMovementApply`, `fnInventoryReconcile` |
| 4 | Purchase order lifecycle | `purchaseOrders/{po}` | no | `fnPoTransition`, `fnPoReceive` |
| 5 | Prepared-ingredient (prep task) | `prepTasks/{task}` | yes | `fnPrepTaskTransition`, `fnPrepProduce` |
| 6 | Loyalty lifecycle | `loyaltyAccounts/{uid}` + `transactions` | no | `fnLoyaltyEarn`, `fnLoyaltyRedeem`, `fnLoyaltyExpire` |
| 7 | Staff assignment lifecycle | `users.staff` / `prepTasks.assignedToUid` | no | `fnStaffAssign` (light; mostly rule-guarded) |

**Cross-machine reactions (the choreography that ties it together):**
```
Order → completed ──► fnOrderFulfill ──► StockMovement(out) per BOM line ──► Inventory machine (#3)
                                    └──► fnLoyaltyEarn ──► Loyalty machine (#6)
PO → received ───────► fnPoReceive ───► StockMovement(in) ──► Inventory machine (#3) + cost recompute
PrepTask → done ─────► fnPrepProduce ─► StockMovement(out raw + in prepared) ──► Inventory (#3)
Inventory change ────► fnRecomputeAvailability ──► menu.availabilityComputed (auto-86)
```

---

## 1. Order Lifecycle

Extends the **existing** machine in `orderService.js` (`placed→accepted→preparing→ready→completed`). Adds only an additive terminal `cancelled` branch (manager-guarded). The forward path is unchanged for full backward compatibility.

### State diagram
```
            ┌─────────┐  accept   ┌──────────┐  start   ┌───────────┐  finish  ┌────────┐  serve/pickup ┌───────────┐
  create →  │ placed  │ ───────►  │ accepted │ ───────► │ preparing │ ───────► │ ready  │ ────────────► │ completed │ (terminal)
            └────┬────┘           └────┬─────┘          └────┬──────┘          └───┬────┘               └───────────┘
                 │                     │                     │                     │                          │
                 │ cancel              │ cancel              │ cancel              │ cancel                   ▼ on enter:
                 ▼                     ▼                     ▼                     ▼                   move to orders_history,
            ┌──────────────────────────────────────────────────────────────────────┐                explode BOM, accrue loyalty
            │                         cancelled  (terminal, manager only)            │
            └──────────────────────────────────────────────────────────────────────┘
```
*(`completed` and `cancelled` are the only terminal states. `cancelled` from `preparing`/`ready` flags a `wasteReview` for the inventory machine.)*

### Allowed transitions
| From | To | Allowed by | Guard |
|---|---|---|---|
| (none) | placed | Customer / Staff | valid cart, channel set; QR/anon allowed |
| placed | accepted | Staff | order exists & active |
| accepted | preparing | Staff | — |
| preparing | ready | Staff | — |
| ready | completed | Staff / System | payment settled if required (`[PRD-TBD]`) |
| placed/accepted/preparing/ready | cancelled | **Manager** | reason required |
| any → non-adjacent | ✗ | — | rejected by `canTransitionTo` (forward-only) |

### Trigger source & CF ownership
| Transition | Trigger | CF owner | Side effects owned |
|---|---|---|---|
| create | Customer/Staff (client write, rules-validated) | — (direct create, existing `createOrder`) | allocate `orderNumber` via `fnCounter` |
| any forward step | Staff (KDS drag/bump) → request | **`fnOrderTransition`** | validate machine, stamp `timeline.*`, append `events[]` |
| → completed | Staff/System | **`fnOrderTransition`** → invokes **`fnOrderFulfill`** | move active→history (existing pattern), **explode recipe BOM → stock-out movements**, **trigger `fnLoyaltyEarn`** |
| → cancelled | Manager | **`fnOrderTransition`** | history move with `cancelled`, optional waste review, no loyalty accrual |

> **Inventory decrement timing is `[PRD-TBD]`** (at `ready` vs `completed`). Diagram shows `completed`; the Function reads `provider` config so the choice is data-driven, not a code change.

---

## 2. Order-Item Lifecycle

Per-line status inside `orders_active.items[].lineStatus` — enables station-level KDS where different items of one order progress independently (grill vs cold line). The **order** status is a roll-up of its items.

### State diagram
```
  queued ──► preparing ──► ready ──► served
     │           │           │
     └───────────┴───────────┴────► voided (manager; e.g. 86'd mid-order)
```

### Allowed transitions
| From | To | Allowed by |
|---|---|---|
| queued | preparing | Staff (station) |
| preparing | ready | Staff (station) |
| ready | served | Staff (expo) |
| any | voided | Manager |

### Roll-up rule (item → order)
| When items reach… | Order auto-transitions to… |
|---|---|
| first item `preparing` | order `preparing` |
| **all** items `ready` | order `ready` |
| **all** items `served` | order `completed` |

### Trigger source & CF ownership
| Transition | Trigger | CF owner |
|---|---|---|
| line status change | Staff (station KDS card) | **`fnOrderItemTransition`** — validates line machine, then recomputes order roll-up and delegates any resulting order-level transition to **`fnOrderTransition`** (#1). Voiding a prepared line flags waste. |

> Keeps the order machine (#1) as the single authority for order-level side effects; the item machine only *feeds* it.

---

## 3. Inventory Lifecycle (stock item)

Two intertwined machines: the **stock-level state** (a derived status on `inventory/{item}`) and the **movement ledger** (append-only, immutable). The ledger is the truth; the status is a cache the system reacts to.

### Stock-level state diagram (derived)
```
                onHand > reorderPoint
            ┌──────────────────────────┐
            │        in_stock          │◄────────────── receipt / prep_produce raises onHand
            └─────────┬────────────────┘
   onHand ≤ reorderPoint │   ▲ replenish
                         ▼   │
            ┌──────────────────────────┐
            │         low_stock         │ (status-active; triggers reorder suggestion)
            └─────────┬────────────────┘
        onHand ≤ 0     │   ▲ replenish
                       ▼   │
            ┌──────────────────────────┐
            │        out_of_stock       │ (status-danger; auto-86 dependent menu items)
            └──────────────────────────┘

  (orthogonal) prepared items only:  fresh ──aging──► expiring ──past shelfLife──► expired(→waste)
```

### Movement ledger (the actual write model — append-only)
```
  movement.type ∈ { in, out, adjust, waste, count, transfer }
  each movement: signed qtyBase, balanceAfter, source{kind,ref}, immutable.
  inventory.onHand = denormalized cache = Σ qtyBase (reconciled nightly).
```

### Allowed "transitions" (movements)
| Movement type | Direction | Source kind | Allowed by |
|---|---|---|---|
| in | +qty | `po_receipt`, `prep_produce`, `transfer` | Function only |
| out | −qty | `order_fulfillment`, `prep_consume`, `transfer` | Function only |
| adjust | ± | `manual_adjust` | Manager (via Function) |
| waste | −qty | `waste`, `expiry` | Staff/Manager (via Function) |
| count | set | `physical_count` | Staff (via Function) — writes a correcting movement, never edits |

Stock-level status changes are **never written directly** — they are recomputed from `onHand` after each movement.

### Trigger source & CF ownership
| Event | Trigger | CF owner | Notes |
|---|---|---|---|
| any movement applied | Function-reaction (from #1, #4, #5) or Staff/Manager request | **`fnStockMovementApply`** | writes ledger entry + updates `onHand/reserved/available/valuation` + recomputes stock-level status, all in one transaction; idempotent per source ref |
| stock-level crosses threshold | Function-reaction | **`fnStockMovementApply`** → emits low/out events | flips `lowStock`, triggers reorder suggestion |
| onHand → 0 | Function-reaction | **`fnRecomputeAvailability`** | updates `menu.availabilityComputed` → **auto-86** affected menu items |
| nightly reconcile | System (scheduled) | **`fnInventoryReconcile`** | recompute cache = Σ ledger; flag drift |
| prepared item expiry | System (scheduled) | **`fnExpiryWaste`** | past `shelfLifeHours` → `waste` movement |

---

## 4. Purchase-Order Lifecycle

Procurement state on `purchaseOrders/{po}`. Receiving is the side-effect-heavy transition (feeds the inventory machine + cost recompute).

### State diagram
```
  ┌───────┐ submit  ┌───────────┐ partial receipt ┌─────────┐ full receipt ┌──────────┐
  │ draft │ ──────► │ submitted │ ───────────────► │ partial │ ───────────► │ received │ (terminal)
  └───┬───┘         └─────┬─────┘                  └────┬────┘              └──────────┘
      │ cancel            │ cancel                      │ (further receipts)
      ▼                   ▼                             ▼
  ┌──────────────────────────────────────────────────────┐
  │                  cancelled  (terminal)                 │
  └──────────────────────────────────────────────────────┘
```

### Allowed transitions
| From | To | Allowed by | Guard |
|---|---|---|---|
| (none) | draft | Manager / System | System creates from reorder suggestions |
| draft | submitted | Manager | ≥1 line, vendor set, meets vendor minimum |
| submitted | partial | Staff/Manager (receiving) | some lines `receivedBase` < `orderedBase` |
| submitted / partial | received | Staff/Manager (receiving) | all lines fully received |
| draft / submitted / partial | cancelled | Manager | no further receipts allowed |
| draft | (edit lines) | Manager | only in draft; submitted POs are immutable except via receiving |

### Trigger source & CF ownership
| Transition | Trigger | CF owner | Side effects |
|---|---|---|---|
| create draft | Manager, or System (reorder) | direct write / **`fnReorderSuggest`** | allocate `poNumber` via `fnCounter` |
| submit | Manager | **`fnPoTransition`** | lock lines, stamp timeline/events, notify vendor `[PRD-TBD]` |
| receive (partial/full) | Staff/Manager | **`fnPoReceive`** | per received line → **`in` stock movement** (#3) + **moving-average cost recompute** on ingredient + update `receivedBase`; sets `partial`/`received` |
| cancel | Manager | **`fnPoTransition`** | terminal; no inventory effect |

---

## 5. Prepared-Ingredient Lifecycle (prep task)

Production of mise-en-place. The `prepTasks` board card drives it; completion produces a prepared ingredient (stock-in) by consuming raw/sub-prep ingredients (stock-out) via the task's recipe.

### State diagram
```
  ┌──────┐ start  ┌─────────────┐ complete ┌──────┐
  │ todo │ ─────► │ in_progress │ ───────► │ done │ (terminal)
  └───┬──┘        └──────┬──────┘          └──────┘
      │ cancel           │ cancel             ▲ on enter:
      ▼                  ▼                     │ consume components (out) + produce batch (in)
  ┌────────────────────────────┐
  │      cancelled (terminal)   │   (releases any reserved components)
  └────────────────────────────┘
```

### Allowed transitions
| From | To | Allowed by | Guard / effect |
|---|---|---|---|
| (none) | todo | Staff / System | System auto-creates from par shortfall |
| todo | in_progress | Staff (assigned) | **reserves** raw components in inventory (`reserved`) |
| in_progress | done | Staff | produces batch; consumes components |
| todo / in_progress | cancelled | Staff/Manager | releases reservations |

### Trigger source & CF ownership
| Transition | Trigger | CF owner | Side effects |
|---|---|---|---|
| auto-create | System (par check) | **`fnPrepSuggest`** (scheduled) | creates `todo` tasks where prepared `onHand < par` |
| start | Staff (board drag) | **`fnPrepTaskTransition`** | set `reserved` on component inventory |
| done | Staff (board drag) | **`fnPrepTaskTransition`** → **`fnPrepProduce`** | recipe explosion: **`out` movements** for raw/sub-prep + **`in` movement** for the prepared ingredient batch; clears reservations; idempotent |
| cancel | Staff/Manager | **`fnPrepTaskTransition`** | release reservations, no production |
| nightly archive | System | **`fnPrepArchive`** | move `done`/`cancelled` tasks to `analytics/events`, delete from hot board |

---

## 6. Loyalty Lifecycle

Points ledger on `loyaltyAccounts/{uid}` + append-only `transactions`. Balance is a denormalized cache reconciled from the ledger. Tier is derived from lifetime earned.

### Account/tier state diagram (derived from lifetime points)
```
  bronze ──lifetime ≥ T1──► silver ──lifetime ≥ T2──► gold      [T1,T2 = PRD-TBD]
   ▲                                                    │
   └──────────── (tiers never downgrade on redeem) ─────┘
```

### Points transaction machine (per txn — append-only)
```
                       order completed
  (no txn) ─────────────────────────────► earn (+points)
  (no txn) ── customer redeems reward ───► redeem (−points)   guard: balance ≥ cost
  (no txn) ── manager correction ────────► adjust (±points)
  (no txn) ── points past expiry window ─► expire (−points)   [PRD-TBD expiry]
   each txn: signed points, balanceAfter, source, immutable.
```

### Allowed transitions (transaction types)
| Type | Sign | Trigger | Guard |
|---|---|---|---|
| earn | + | order → completed | order not already accrued (idempotent on order ref) |
| redeem | − | customer applies reward at checkout | `balance ≥ reward.costPoints`, reward active |
| adjust | ± | manager | reason required |
| expire | − | scheduled | points older than expiry window |

### Trigger source & CF ownership
| Event | Trigger | CF owner | Side effects |
|---|---|---|---|
| earn | Function-reaction from order completion (#1) | **`fnLoyaltyEarn`** | append `earn` txn, update balance + lifetime + recompute tier; idempotent per order |
| redeem | Customer (checkout) → request | **`fnLoyaltyRedeem`** | validate balance, append `redeem`, apply discount to order pricing |
| adjust | Manager | **`fnLoyaltyAdjust`** | append `adjust`, recompute |
| expire | System (scheduled) | **`fnLoyaltyExpire`** | append `expire` for aged points |
| reconcile | System (scheduled) | **`fnLoyaltyReconcile`** | balance = Σ ledger; flag drift |

---

## 7. Staff Assignment Lifecycle

Lightest machine — mostly rule-guarded direct writes, with a thin Function for audit + conflict checks. Governs which staff are assigned to which station/lane (`users.staff.assignedStationIds`) and which prep tasks (`prepTasks.assignedToUid`).

### State diagram (per staff member, per shift context)
```
  ┌───────────┐ assign  ┌──────────┐ reassign ┌──────────┐
  │ available │ ──────► │ assigned │ ───────► │ assigned │  (different station)
  └─────┬─────┘         └────┬─────┘          └────┬─────┘
        ▲                    │ unassign            │ clock-out
        └────────────────────┴─────────────────────┘
                       (back to available / off_shift)

  orthogonal shift state:  off_shift ──clock-in──► on_shift ──clock-out──► off_shift
```

### Allowed transitions
| From | To | Allowed by | Guard |
|---|---|---|---|
| available | assigned | Manager (staff-assignment DnD) | target is `on_shift`, role permits station |
| assigned | assigned (other station) | Manager | reassignment |
| assigned | available | Manager | unassign |
| off_shift | on_shift | Staff/Manager | clock-in |
| on_shift | off_shift | Staff/Manager | clock-out → auto-unassign |

### Trigger source & CF ownership
| Transition | Trigger | CF owner | Notes |
|---|---|---|---|
| assign / reassign / unassign | Manager (DnD, Document A §7.4) | **`fnStaffAssign`** (light) | validates role-vs-station eligibility + no double-booking; writes `assignedStationIds` / `prepTasks.assignedToUid`; appends audit event. Most reads/writes are rule-guarded; the Function exists for conflict checks + audit. |
| clock-in / clock-out | Staff/Manager | **`fnStaffAssign`** | clock-out cascades to unassign open assignments |

> Distinct from **role** management (customer/staff/manager/admin), which is owned by the user/claims-sync Function in the architecture doc. Assignment is operational; role is authorization.

---

## 8. Cross-Cutting Workflow Principles (scalability)

1. **One authority per state.** Every transition has exactly one owning Function; no two code paths mutate the same state. This is what keeps the system reasoning-about-able as machines multiply.
2. **Append-only ledgers for anything physical or financial** (inventory, loyalty). State is derived/cached; truth is the ledger. Enables reconciliation, audit, and point-in-time replay.
3. **Idempotent side effects.** Every fan-out is guarded by a source-ref/flag so retries (inevitable in distributed systems) never double-count stock or points.
4. **Choreography over orchestration.** Machines react to each other via Firestore triggers (order→inventory→loyalty), so each stays independently deployable and testable — no central monolith function.
5. **Client requests, server decides.** The optimistic UI (Documents A/B) makes transitions feel instant; the Function is the source of truth and snaps back illegal moves. The existing `canTransitionTo` guard is the template, enforced server-side.
6. **Scheduled reconcilers** for every cache (inventory, loyalty) catch drift and make the system self-healing.
7. **Shared status vocabulary** (Document B §2.3) means a state means the same thing visually everywhere — the human-facing complement to these machines.

---

*End of Document C. Together with the architecture, frontend, and design-system documents, this completes the pre-implementation design set. Recommended next deliverables: `firestore.rules`, `firestore.indexes.json`, Cloud Function skeletons (named per §0), and a component/token storybook.*
