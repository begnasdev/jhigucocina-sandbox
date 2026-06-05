# Document A — JhiguCocina Frontend Architecture

**Status:** Design only (no implementation code)
**Date:** 2026-06-05
**Companion to:** `docs/firestore-architecture.md`
**Scope:** Complete React application structure for the full product across eight app modules.

> Built to extend the existing app, not replace it. The current stack — React 19, Vite 8, `react-router-dom` v7, Context providers in `main.jsx`, `ProtectedRoute` + `RoleGuard`, and per-domain service files in `src/services/` that take a `providerId` argument — is **load-bearing and preserved**. Everything below is additive.

---

## 1. Compatibility Baseline (what we keep)

| Existing asset | File | Role going forward |
|---|---|---|
| Router shell | `routes/AppRoutes.jsx` | Split into per-module route groups; same `<Routes>/<Route>` API. |
| Auth gate | `routes/ProtectedRoute.jsx` | Kept. Composed with new `ProviderGuard`. |
| Role gate | `components/RoleGuard.jsx` | Kept (`allowedRoles` prop). Console logs removed; `<AccessDenied/>` replaces inline `<h2>`. |
| Auth state | `context/AuthContext.jsx` | Kept. Becomes one of several scoped contexts. |
| Cart state | `context/CartContext.jsx` | Kept; moves under the Customer module boundary. |
| Service pattern | `services/*.js` | Kept. Every function already takes `providerId = DEFAULT_PROVIDER_ID`; all new services follow the identical signature. |
| Provider default | `config/providerConfig.js` | Kept; promoted to a runtime-resolved `ProviderContext`. |

**Non-negotiable rule:** no new service may hardcode a Firestore path that isn't tenant-scoped (`providers/{providerId}/…`). This mirrors `menuService.js` / `orderService.js` exactly.

---

## 2. Top-Level Application Structure

A **feature-module** layout. Each of the eight app modules is a self-contained folder owning its pages, components, hooks, and local state — but all share the cross-cutting `services/`, `ui/` (design system), and `lib/` layers. This keeps the codebase navigable as it grows past dozens of screens.

```
src/
├── main.jsx                       # provider composition root (existing)
├── App.jsx                        # shell: AppShell + AppRoutes
│
├── app/
│   ├── AppShell.jsx               # chrome: nav, module switcher, toasts, theme boundary
│   ├── routes/
│   │   ├── AppRoutes.jsx          # top router → lazy-loads module route groups (existing, refactored)
│   │   ├── ProtectedRoute.jsx     # existing
│   │   ├── ProviderGuard.jsx      # NEW: resolves providerId, blocks cross-tenant
│   │   └── moduleRoutes.js        # route table registry (path → module → roles)
│   └── providers/                 # global context composition
│       ├── AuthContext.jsx        # existing
│       ├── ProviderContext.jsx    # NEW: current tenant config + providerId
│       ├── ThemeContext.jsx       # NEW: dark/light
│       └── QueryClientProvider     # data-fetch cache (see §6)
│
├── modules/
│   ├── customer/                  # Customer ordering (web + QR)
│   ├── provider-admin/            # Menu, recipes, vendors, users, settings
│   ├── kitchen-display/           # KDS board
│   ├── prep-line/                 # Prep board / mise-en-place
│   ├── inventory/                 # Stock, movements, counts
│   ├── purchasing/                # POs, vendors, receiving
│   ├── dine-in/                   # Floor map, tables, sessions
│   └── analytics/                 # Dashboards & reports
│       └── (each module:)
│           ├── routes.jsx         # module-local <Route> subtree
│           ├── pages/             # route-level screens
│           ├── components/        # module-specific components
│           ├── hooks/             # module data hooks (wrap services)
│           └── state/             # module-scoped context/store if needed
│
├── services/                      # SHARED data layer (existing pattern extended) — see §5
│   ├── firebase/firebase.js       # existing
│   ├── menuService.js             # existing
│   ├── orderService.js            # existing
│   ├── userService.js             # existing
│   ├── authService.js             # existing
│   ├── recipeService.js           # NEW
│   ├── ingredientService.js       # NEW (raw + prepared)
│   ├── inventoryService.js        # NEW
│   ├── vendorService.js           # NEW
│   ├── purchaseOrderService.js    # NEW
│   ├── prepService.js             # NEW (prep lines + tasks)
│   ├── tableService.js            # NEW (tables + sessions + QR)
│   ├── loyaltyService.js          # NEW
│   ├── analyticsService.js        # NEW (reads rollups)
│   └── functionsService.js        # NEW: typed wrappers for Callable Cloud Functions
│
├── ui/                            # DESIGN SYSTEM (see Document B)
│   ├── primitives/                # Button, Input, Badge, Card…
│   ├── data/                      # Table, DataGrid, StatCard…
│   ├── board/                     # Kanban primitives (Column, Card, DnD context)
│   └── theme/                     # tokens, ThemeProvider
│
├── lib/                           # framework-agnostic helpers
│   ├── dnd/                       # drag-and-drop abstraction (see §7)
│   ├── money.js                   # minor-unit math (matches Firestore *Minor)
│   ├── units.js                   # ingredient unit conversion (base/purchase)
│   ├── stateMachines/             # client mirrors of Document C machines
│   └── realtime.js                # onSnapshot subscription helpers
│
└── config/
    ├── providerConfig.js          # existing
    └── roles.js                   # existing
```

### Module → data → role mapping

| Module | Primary collections (from arch doc) | Min role | Realtime? |
|---|---|---|---|
| Customer | `menu`, `menuCategories`, `orders_active`, `loyaltyAccounts`, `qrCodes`, `tables/sessions` | public / customer / anon | yes (own orders) |
| Provider Admin | `menu`, `recipes`, `rawIngredients`, `preparedIngredients`, `vendors`, `users`, `providers/{p}` | manager / admin | no (mostly) |
| Kitchen Display | `orders_active` | staff+ | **yes** (core) |
| Prep Line | `prepLines`, `prepTasks`, `preparedIngredients`, `inventory` | staff+ | **yes** |
| Inventory | `inventory`, `stockMovements`, `rawIngredients`, `preparedIngredients` | staff+ | partial |
| Purchasing | `purchaseOrders`, `vendors`, `vendors/priceList`, `inventory` | manager+ | no |
| Dine-In | `tables`, `tables/sessions`, `orders_active`, `qrCodes` | staff+ | **yes** |
| Analytics | `analytics/**` | manager+ | no (rollups) |

---

## 3. App Modules (responsibilities & key screens)

### 3.1 Customer
- **Screens:** Home, Menu (by category + filters), Item detail (modifiers), Cart, Checkout, My Orders (live status), Loyalty wallet, QR-table landing.
- **Notes:** QR landing resolves `qrCodes/{shortCode}` → channel/table, then opens an (optionally anonymous-auth) session. Reuses existing `CartContext`. Live order tracking reuses `subscribeToUserOrders`.

### 3.2 Provider Admin
- **Screens:** Dashboard, Menu management (existing page extended), Category manager, **Recipe builder** (DnD, §7), Raw ingredient catalog, Prepared ingredient catalog, Vendor directory, User/role management (existing), Provider settings (tax, channels, loyalty, branding).
- **Notes:** This is the configuration brain. Recipe builder is the most complex screen; it writes the BOM (`recipes.components[]`).

### 3.3 Kitchen Display (KDS)
- **Screens:** Live board (kanban by status or by station), Expo view, Recall/bump history.
- **Notes:** Pure realtime; the highest-throughput read surface. Drives order/item state transitions via `functionsService` (server-authoritative, per security strategy).

### 3.4 Prep Line
- **Screens:** Daily prep board (kanban by station), Batch detail, Par-level shortfall suggestions.
- **Notes:** Cards = `prepTasks`. "Done" triggers `prep_produce`/`prep_consume` movements via Cloud Function.

### 3.5 Inventory
- **Screens:** Stock-on-hand grid, Item detail + movement ledger, Physical count, Waste log, Low-stock/reorder dashboard.
- **Notes:** Read-heavy grids; all writes (adjust/count/waste) go through Callable Functions because ledgers are Function-only.

### 3.6 Purchasing
- **Screens:** PO list (by status), PO builder, Receiving screen, Vendor price lists, Reorder suggestions → draft PO.
- **Notes:** Receiving is a transaction surface; calls `purchaseOrderService.receive()` → Function writes stock-in + cost recompute.

### 3.7 Dine-In
- **Screens:** Floor map (table status), Table/session detail, Bill/split, Host seating, QR code manager.
- **Notes:** Floor map is realtime over `tables`. Sessions aggregate `orders_active` by `sessionId`.

### 3.8 Analytics
- **Screens:** Sales dashboard, Menu performance, Food-cost & margin, Inventory valuation, Loyalty insights, Channel mix.
- **Notes:** Reads precomputed `analytics/**` rollups only — never aggregates client-side. Deep/ad-hoc analysis links to BigQuery export.

---

## 4. Routing Structure

Top router lazy-loads each module's route subtree (code splitting per module → fast first paint for customers who never load admin bundles). Existing paths are preserved; new paths are namespaced per module.

```
/                         Customer  public      Home
/menu                     Customer  public      Menu               (existing)
/menu/:itemId             Customer  public      Item detail
/cart                     Customer  public      Cart               (existing /customer/cart kept as alias)
/checkout                 Customer  customer/anon
/orders                   Customer  customer    My Orders          (existing /customer/orders alias)
/loyalty                  Customer  customer    Wallet
/t/:shortCode             Customer  public/anon QR table landing
/login /signup            Auth      public                          (existing)

/admin                    ProviderAdmin  manager+  Dashboard
/admin/menu               ProviderAdmin  manager+  Menu mgmt         (existing /manager/menu alias)
/admin/menu/categories    ProviderAdmin  manager+
/admin/recipes            ProviderAdmin  manager+  Recipe builder
/admin/ingredients/raw    ProviderAdmin  manager+
/admin/ingredients/prep   ProviderAdmin  manager+
/admin/vendors            ProviderAdmin  manager+
/admin/users              ProviderAdmin  admin     Users             (existing /admin/users)
/admin/settings           ProviderAdmin  admin

/kds                      Kitchen   staff+    Live board            (existing /staff → redirect)
/kds/expo                 Kitchen   staff+
/kds/recall               Kitchen   staff+

/prep                     PrepLine  staff+    Prep board
/prep/:taskId             PrepLine  staff+

/inventory                Inventory staff+    Stock grid
/inventory/:itemId        Inventory staff+    Item + ledger
/inventory/count          Inventory staff+
/inventory/reorder        Inventory manager+

/purchasing               Purchasing manager+ PO list
/purchasing/new           Purchasing manager+ PO builder
/purchasing/:poId         Purchasing manager+
/purchasing/:poId/receive Purchasing manager+ Receiving

/dinein                   DineIn    staff+    Floor map
/dinein/table/:tableId    DineIn    staff+    Session detail
/dinein/qr                DineIn    manager+  QR manager

/analytics                Analytics manager+ Dashboard
/analytics/menu           Analytics manager+
/analytics/foodcost       Analytics manager+
/analytics/inventory      Analytics manager+
/analytics/loyalty        Analytics manager+
```

### Guard composition

Every protected route is wrapped: `ProviderGuard → ProtectedRoute → RoleGuard`. Existing aliases (`/staff`, `/manager`, `/customer/*`) issue `<Navigate replace>` to the new canonical paths so bookmarks and any in-flight code keep working.

```
<Route element={<ProviderGuard/>}>            # resolve tenant, 404 if suspended
  <Route element={<ProtectedRoute/>}>         # existing auth gate
    <Route element={<RoleGuard allowedRoles={['manager','admin']}/>}>  # existing
      ...module routes
```

A central **`moduleRoutes.js` registry** (path, element, module, roles, lazyImport) is the single source the router, the nav, and the module switcher all read from — so adding a screen is one entry, not three edits.

---

## 5. Reusable Service Layer Architecture

Three layers, preserving the existing flat-function style at the bottom.

```
   React components / pages
        │  (never import firebase directly)
        ▼
   Hooks layer  (modules/*/hooks, lib/realtime)        ← React-aware: caching, subscriptions, optimistic UI
        │
        ▼
   Service layer  (services/*.js)                       ← EXISTING PATTERN: pure async fns, take providerId
        │                                   ┌───────────────────────────────┐
        ├── direct Firestore reads/writes ──┤ allowed only where rules allow │
        └── Callable wrappers ──────────────┤ functionsService.js            │  ← sensitive/transactional ops
                                            └───────────────────────────────┘
        ▼
   Firebase SDK (firebase/firebase.js)                  ← EXISTING single init
```

### Rules of the service layer
1. **Signature parity with existing code.** Every function: `doThing(args, providerId = DEFAULT_PROVIDER_ID)`. Identical to `getMenuItems`, `createOrder`, etc.
2. **Read vs. write split by security model.** Reads and customer-safe writes hit Firestore directly (as today). Anything the security strategy marks **Function-only** (inventory movements, loyalty, order status transitions, PO receiving, counters) goes through `functionsService.js`, which wraps `httpsCallable`. Components can't tell the difference — both return promises.
3. **No business math in components.** Money (`lib/money.js`) and unit conversion (`lib/units.js`) live in `lib/`, shared by services and UI.
4. **Realtime via `lib/realtime.js`.** Standardizes `onSnapshot` subscribe/unsubscribe and returns the same `{id, ...data}` mapping the existing services use.

### Service → collection ownership (one service owns one domain)

| Service | Owns | Direct write? | Function-only ops |
|---|---|---|---|
| `menuService` (existing) | menu, categories | yes (manager) | — |
| `orderService` (existing) | orders_active/history | create + read | **status transitions, history move** |
| `recipeService` | recipes | yes (manager) | cost rollup (triggered) |
| `ingredientService` | raw + prepared ingredients | yes (manager) | — |
| `inventoryService` | inventory (read) | **no** | adjust, count, waste, reconcile |
| `vendorService` | vendors, priceList | yes (manager) | — |
| `purchaseOrderService` | purchaseOrders | draft edits | submit, **receive** |
| `prepService` | prepLines, prepTasks | task CRUD | **task done → movements** |
| `tableService` | tables, sessions, qrCodes | session edits | session close/payment |
| `loyaltyService` | loyalty (read) | **no** | earn, redeem |
| `analyticsService` | analytics (read) | **no** | — |
| `functionsService` | Callable transport | — | (all of the above) |

---

## 6. State Management Architecture

Deliberately **layered, not monolithic** — no single global store. Each kind of state lives where it belongs, which keeps re-renders local and the app scalable.

| State kind | Mechanism | Examples | Why |
|---|---|---|---|
| **Auth / identity** | `AuthContext` (existing) | user, role, uid | Already there; global, rarely changes. |
| **Tenant** | `ProviderContext` (new) | providerId, provider config, feature flags | One value read everywhere; resolves the hardcoded default. |
| **Theme** | `ThemeContext` (new) | dark/light, density | Cross-cutting UI concern. |
| **Server cache (remote data)** | **Query cache** (React Query–style) via `QueryClientProvider` | menu, recipes, inventory grids, POs, analytics | Dedupe, background refetch, stale-while-revalidate. Replaces ad-hoc `useState`+`useEffect` fetches. |
| **Realtime streams** | `onSnapshot` hooks (`lib/realtime`) feeding the query cache | KDS board, prep board, floor map, own orders | Firestore is the source of truth; hooks push snapshots into cache so UI stays declarative. |
| **Cross-screen UI flows** | Module-scoped Context | `CartContext` (existing), dine-in session, PO builder draft | State that several screens in one module share but the rest of the app doesn't need. |
| **Ephemeral local UI** | `useState`/`useReducer` | modals, form fields, board drag state | Never leaves the component. |
| **Optimistic mutations** | query-cache mutation + rollback | bump order, move kanban card | Snappy UX; reconciles when the snapshot/Function confirms. |

### Principles
- **Server state ≠ client state.** Remote data is owned by the query/realtime cache, never copied into a global store. This is the single biggest scalability decision — it prevents the stale-duplication problems that kill large Firestore apps.
- **Realtime where it matters, polling/cache where it doesn't.** KDS, prep, floor map, and customer order tracking subscribe live; admin catalogs and analytics use cached fetches with manual/interval refresh.
- **Context is for slowly-changing or module-shared values only** — never for high-frequency board state (which stays local to the board to avoid app-wide re-renders).
- **Optimistic-by-default for staff actions** (bump, move, assign) because the security model makes them server-authoritative anyway; the cache rolls back if the Function rejects.

---

## 7. Drag-and-Drop Architecture

One shared DnD abstraction in `lib/dnd/` (a thin wrapper over a single chosen library, e.g. dnd-kit — chosen for pointer/touch/keyboard accessibility and virtualization friendliness). Every board consumes the **same primitives** from `ui/board/`, so behavior, accessibility, and styling are consistent across all four use cases.

### Shared model
```
DndProvider (sensors: pointer + touch + keyboard, collision strategy)
  └── Droppable region(s)
        └── Sortable / Draggable item(s)
              └── onDragEnd → reducer → optimistic cache update → service/Function call
```
Three cross-cutting concerns handled once in the abstraction:
- **Optimistic move + rollback** (drag feels instant; reverts if the write fails).
- **Authority check** before commit (RoleGuard-equivalent at the action level).
- **Persistence mapping** (a drop = a specific service/Function call, defined per board).

### 7.1 Kitchen board (KDS)
- **Layout:** columns = order status (`placed→accepted→preparing→ready`) **or** swimlanes = stations.
- **Drag:** an order (or order-item) card between status columns = **a state transition**.
- **Persistence:** drop calls `orderService` → `functionsService.transitionOrder()`. Because transitions are server-authoritative, the drop is optimistic and validated against the order state machine (Document C); illegal drops snap back.
- **Scale:** virtualized columns; only `orders_active` (bounded) ever loads.

### 7.2 Recipe builder
- **Layout:** left palette = ingredient catalog (raw + prepared, searchable, virtualized); right canvas = the recipe's `components[]` BOM.
- **Drag:** ingredient → recipe canvas = add a component line; reorder = sort steps; drag a prepared ingredient = nests a sub-recipe reference.
- **Persistence:** edits stage in a module-local reducer (PO-builder-style draft), then a single `recipeService.save()` writes `components[]` and bumps `version`. Live cost preview recomputes client-side from `costCache` values (authoritative recompute is a Function).
- **Scale:** palette virtualized; canvas bounded (recipes ~≤40 lines).

### 7.3 Prep-line management
- **Two DnD surfaces:**
  1. **Task board:** prep-task cards across `todo→in_progress→done` columns per station → updates `prepTasks.status` (state machine, Document C).
  2. **Line configuration:** drag stations to reorder (`prepLines.sortOrder`) and drag menu/recipe routing chips onto a station (`routesMenuTags`).
- **Persistence:** task moves → `prepService.updateTaskStatus()` (done → Function writes movements); config moves → `prepService` direct writes (manager).

### 7.4 Staff assignment
- **Layout:** roster lane (available staff chips) + station/lane columns (KDS lanes or prep lines).
- **Drag:** a staff chip onto a station = assign; between stations = reassign; back to roster = unassign.
- **Persistence:** writes `users.staff.assignedStationIds` and/or `prepTasks.assignedToUid` via `userService`/`prepService`. Follows the staff-assignment lifecycle in Document C. Multi-select drag supported for bulk shift assignment.

### Why one abstraction
A single `lib/dnd` + `ui/board` pair means: consistent keyboard accessibility (WCAG), one place to tune touch sensors for tablets on the line, uniform optimistic/rollback semantics, and no divergence as boards multiply. Each board only declares *what a drop means* (its service call) — never *how dragging works*.

---

## 8. Cross-Cutting Concerns

- **Error/permission boundaries:** `<AccessDenied/>` (replaces `RoleGuard`'s inline `<h2>`), route-level error boundaries, and a global toast channel.
- **Offline/poor-connection (kitchen reality):** query cache + Firestore offline persistence keep KDS/prep usable on flaky tablet Wi-Fi; queued mutations flush on reconnect.
- **Performance:** per-module lazy routes, virtualized tables/boards, realtime only where required, minor-unit math to avoid float churn.
- **Testability:** services are pure functions (already unit-testable today); state machines mirrored in `lib/stateMachines` are tested independently of UI; rules tested via emulator (per arch doc §6.4).
- **Accessibility & i18n:** design-system primitives (Document B) carry a11y; `provider.locale` drives currency/number/date formatting through `lib/money` and Intl.

---

*End of Document A.*
