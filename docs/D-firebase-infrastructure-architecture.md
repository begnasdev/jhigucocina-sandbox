# Document D — JhiguCocina Firebase Infrastructure Architecture

**Status:** Design only (no implementation code)
**Date:** 2026-06-05
**Companion to:** `firestore-architecture.md` (data), `A-frontend-architecture.md` (client), `B-design-system.md` (UI), `C-workflow-architecture.md` (state machines)
**Scope:** Production Firebase backend — Cloud Functions, triggers, environments, CI/CD, testing, observability, cost.

> **Grounding.** This document operationalizes the named functions already defined in Document C §0 (`fnOrderTransition`, `fnOrderFulfill`, `fnStockMovementApply`, `fnPoReceive`, `fnPrepProduce`, `fnLoyaltyEarn`, etc.) and the security model in the architecture doc (sensitive/ledger writes are **Function-only**). Nothing here changes the data model or the state machines; it defines *how the backend runs them reliably at scale*.
>
> **Platform stance:** Cloud Functions for Firebase **2nd gen** (Cloud Run–backed) on **Node 20 / TypeScript**, region-pinned to the provider's primary region (`[PRD-TBD]`, default `us-central1`). 2nd gen is chosen for concurrency (many requests per instance → lower cost), min/max instances (control cold starts and runaway scale), and Eventarc-based triggers.

---

## 1. Cloud Functions Architecture

### 1.1 Function taxonomy

Five categories, each with distinct scaling, security, and reliability needs:

| Category | Invoked by | Examples | Auth surface | Scaling concern |
|---|---|---|---|---|
| **Callable** (`onCall`) | Authenticated client request | `fnOrderTransition`, `fnPoReceive`, `fnLoyaltyRedeem`, `fnStockMovementApply` | App Check + Auth context | Bursty (kitchen rushes) |
| **Firestore triggers** (`onDocumentWritten/Updated/Created`) | Document changes (choreography) | `fnOrderFulfill`, `fnLoyaltyEarn`, `fnRecomputeAvailability` | Trusted (server) | Fan-out amplification |
| **Scheduled** (`onSchedule`) | Cloud Scheduler (cron) | `fnInventoryReconcile`, `fnLoyaltyExpire`, `fnPrepArchive`, `fnExpiryWaste`, `fnPrepSuggest`, `fnAnalyticsRollup` | Trusted | Long-running batch |
| **Auth triggers** (`beforeUserCreated`, `onUserCreate`-equiv) | Firebase Auth events | `fnClaimsSync`, `fnUserProvision` | Trusted | Low volume |
| **HTTPS** (`onRequest`) | External webhooks / exports | payment webhook `[PRD-TBD]`, BigQuery export hook | Signature-verified | Idempotent retries |

### 1.2 Layered internal architecture (inside the functions package)

Functions are **thin entrypoints over a shared domain core** — the same discipline as the frontend service layer. This prevents logic duplication across callable/trigger versions of the same workflow and makes the core unit-testable without the Functions runtime.

```
  Entrypoint layer   (onCall / onDocument* / onSchedule wrappers)
        │  validate input · check App Check/Auth · map errors
        ▼
  Domain layer       (pure business logic: state machines, BOM explosion, cost math)
        │  imports the SAME lib/stateMachines mirrored on the client
        ▼
  Data-access layer  (transactional Firestore repositories, idempotency guards)
        │
        ▼
  Firestore Admin SDK
```

**Key rules**
- One workflow = one domain module; callable and trigger entrypoints both delegate to it (e.g. `fnOrderTransition` callable and `fnOrderFulfill` trigger share the `order` domain core).
- **All multi-document writes use `runTransaction` or batched writes** — never sequential un-atomic writes. Inventory + cost + ledger must commit together or not at all.
- **Idempotency is mandatory** for every side-effecting function (see §5.3).
- Functions never trust client-supplied money/quantities for authoritative math — they re-derive from recipes/price lists server-side.

### 1.3 Per-function runtime configuration

| Function class | minInstances | maxInstances | concurrency | memory | timeout |
|---|---|---|---|---|---|
| Hot callables (`fnOrderTransition`, `fnStockMovementApply`) | 1 (warm) during service hours | 50 | 40 | 256MB | 30s |
| Choreography triggers (`fnOrderFulfill`, `fnLoyaltyEarn`) | 0 | 20 | 1 (transactional safety) | 256MB | 60s |
| Scheduled batch (`fnAnalyticsRollup`, `fnInventoryReconcile`) | 0 | 3 | 1 | 512MB–1GB | up to 540s |
| Auth/claims | 0 | 5 | 10 | 128MB | 10s |

`maxInstances` caps protect Firestore from a function storming it; warm `minInstances` on hot callables eliminates cold-start latency during rushes (a real UX requirement for KDS bumps).

---

## 2. Function Folder Structure

A single deployable `functions/` package, organized by **domain**, mirroring the state machines so the codebase maps 1:1 to Document C.

```
functions/
├── package.json · tsconfig.json · .eslintrc
├── src/
│   ├── index.ts                      # ONLY re-exports entrypoints (deploy manifest)
│   │
│   ├── entrypoints/                  # thin wrappers, grouped by trigger type
│   │   ├── callable/
│   │   │   ├── order.ts              # fnOrderTransition, fnOrderItemTransition
│   │   │   ├── inventory.ts          # fnStockMovementApply (adjust/count/waste)
│   │   │   ├── purchasing.ts         # fnPoTransition, fnPoReceive
│   │   │   ├── prep.ts               # fnPrepTaskTransition
│   │   │   ├── loyalty.ts            # fnLoyaltyRedeem, fnLoyaltyAdjust
│   │   │   └── counters.ts           # fnCounter
│   │   ├── triggers/
│   │   │   ├── order.ts              # fnOrderFulfill (onWritten orders_active)
│   │   │   ├── inventory.ts          # fnRecomputeAvailability (onWritten inventory)
│   │   │   ├── loyalty.ts            # fnLoyaltyEarn (reacts to order completion)
│   │   │   ├── prep.ts               # fnPrepProduce (onUpdate prepTasks → done)
│   │   │   └── recipe.ts             # fnRecipeCostRollup (onWritten recipes/ingredients)
│   │   ├── scheduled/
│   │   │   ├── reconcile.ts          # fnInventoryReconcile, fnLoyaltyReconcile
│   │   │   ├── maintenance.ts        # fnPrepArchive, fnExpiryWaste
│   │   │   ├── suggestions.ts        # fnPrepSuggest, fnReorderSuggest
│   │   │   ├── loyalty.ts            # fnLoyaltyExpire
│   │   │   └── analytics.ts          # fnAnalyticsRollup, fnBigQueryExport
│   │   ├── auth/
│   │   │   └── identity.ts           # fnClaimsSync, fnUserProvision
│   │   └── https/
│   │       └── webhooks.ts           # payment/export webhooks [PRD-TBD]
│   │
│   ├── domain/                       # PURE business logic (no Functions imports)
│   │   ├── order/                    # state machine, roll-up, fulfillment plan
│   │   ├── inventory/                # movement application, valuation, thresholds
│   │   ├── recipe/                   # BOM explosion (recursive), cost rollup
│   │   ├── purchasing/               # PO machine, receiving, moving-avg cost
│   │   ├── prep/                     # prep task machine, produce/consume plan
│   │   ├── loyalty/                  # earn/redeem/tier rules
│   │   ├── staff/                    # assignment eligibility/conflict checks
│   │   └── analytics/               # rollup aggregation logic
│   │
│   ├── data/                         # transactional repositories per collection
│   │   ├── repositories/             # orderRepo, inventoryRepo, ledgerRepo…
│   │   ├── idempotency.ts            # processed-ref guard helpers
│   │   └── paths.ts                  # SINGLE source of Firestore paths (mirrors arch doc §3)
│   │
│   ├── shared/
│   │   ├── stateMachines/            # SAME definitions mirrored in client lib/stateMachines
│   │   ├── money.ts · units.ts       # mirror client lib (minor units, conversions)
│   │   ├── errors.ts                 # typed error taxonomy (§13)
│   │   ├── logger.ts                 # structured logging wrapper (§12)
│   │   └── config.ts                 # env + provider config resolution
│   │
│   └── middleware/                   # appCheck, authz (role/claims), validation (zod), withIdempotency, withTracing
│
└── test/
    ├── unit/                         # domain + shared (no emulator)
    ├── integration/                  # functions ↔ emulator
    └── rules/                        # firestore.rules tests (emulator)
```

**Principles:** `index.ts` is a pure manifest; `domain/` has zero Firebase imports (fast unit tests); `data/paths.ts` is the *only* place paths are written, mirroring the architecture doc's tree so a path change is one edit; `shared/stateMachines` is the literal same logic the client mirrors, guaranteeing client/server agreement.

---

## 3. Trigger Architecture

### 3.1 Trigger selection rules
- **Use the narrowest trigger.** Prefer `onDocumentUpdated` with a field-change predicate over `onDocumentWritten` to avoid firing on irrelevant edits (cost control — every invocation is billed).
- **React to state, not to clients,** for side effects. Clients call a callable to *request* a transition; the resulting side-effect fan-out happens in a Firestore trigger reacting to the committed state. This keeps the write atomic and the fan-out retryable independently.
- **Single-writer per collection for triggers** to avoid trigger loops; a trigger must never write back to the same field it watches without a guard.

### 3.2 Loop & amplification prevention
- Triggers that write to other collections check an idempotency/`processed` marker before fanning out.
- `fnRecomputeAvailability` (watches `inventory`, writes `menu`) and `fnRecipeCostRollup` (watches `recipes`/ingredients, writes back cost cache) use **change-detection guards** so they don't re-trigger themselves.
- Fan-out cardinality is bounded: order fulfillment explodes a *bounded* BOM (≤ ~40 lines); recipe cost rollup walks a bounded prepared-ingredient tree with depth limit + cycle detection.

---

## 4. Callable Functions Architecture

Callables are the **client's only path to sensitive state**. Every callable runs the same middleware pipeline:

```
request
  → withAppCheck()          # reject non-app traffic (anti-abuse, esp. public QR surface)
  → withAuth()              # require auth context (or validated anonymous for QR)
  → withAuthz(role|owner)   # claims-based: maps to security matrix in arch doc §6.3
  → withValidation(schema)  # zod schema; reject malformed input
  → withIdempotency(key)    # dedupe retries
  → withTracing()           # correlation id + structured log span
  → domain handler          # pure logic + transactional repo writes
  → mapError()              # typed error → HttpsError (§13)
```

### 4.1 Callable catalog (client → server authority)

| Callable | Caller role | Domain | Writes |
|---|---|---|---|
| `fnOrderTransition` | staff+ | order | `orders_active`/`orders_history`, triggers fulfill |
| `fnOrderItemTransition` | staff+ | order | `orders_active.items[]`, roll-up |
| `fnStockMovementApply` | staff/manager | inventory | `inventory` + `stockMovements` (adjust/count/waste) |
| `fnPoTransition` | manager | purchasing | `purchaseOrders` |
| `fnPoReceive` | staff/manager | purchasing+inventory | `purchaseOrders`, `stockMovements(in)`, ingredient cost |
| `fnPrepTaskTransition` | staff | prep | `prepTasks`, reservations |
| `fnLoyaltyRedeem` | customer (owner) | loyalty | `loyaltyAccounts`, `transactions`, order pricing |
| `fnLoyaltyAdjust` | manager | loyalty | `loyaltyAccounts`, `transactions` |
| `fnCounter` | staff+ (internal) | counters | `counters` (sequence allocation) |
| `fnStaffAssign` | manager | staff | `users.staff`, `prepTasks.assignedToUid` |

Why callables (not direct writes): the security rules make these collections Function-only; callables give us server-side validation, transactional multi-doc writes, App Check abuse protection, and a typed error contract the UI can render.

---

## 5. Event-Driven Workflow Architecture

### 5.1 Choreography graph (who fires whom)

```
[client callable] fnOrderTransition ──commits──► orders_active(status=completed)
                                                      │ Firestore trigger
                                                      ▼
                                              fnOrderFulfill ──┬─► stockMovements(out) ×N  ──► (trigger) fnRecomputeAvailability ─► menu.availabilityComputed
                                                               └─► (enqueue) fnLoyaltyEarn ─► loyaltyAccounts + transactions

[client callable] fnPoReceive ──commits──► purchaseOrders + stockMovements(in) + ingredient.cost
                                                      │ trigger
                                                      ▼
                                              fnRecipeCostRollup ─► recipes.costCache ─► menu cost stats

[client callable] fnPrepTaskTransition(done) ─► fnPrepProduce ─► stockMovements(out raw + in prepared) ─► fnRecomputeAvailability

[scheduled] fnAnalyticsRollup ◄── reads orders_history, stockMovements, transactions ─► analytics/**
```

### 5.2 Orchestration vs choreography
- **Choreography (default):** independent triggers reacting to committed state — resilient, no central coordinator, each step independently retryable.
- **Where strict ordering/atomicity is required, do it in one transaction inside one function** (e.g. PO receive writes movement + cost + line status atomically), then let downstream choreography pick up.
- **For high fan-out or cross-service work** (BigQuery export, notifications), enqueue via **Cloud Tasks / Pub-Sub** rather than doing it inline — decouples the hot path from slow work.

### 5.3 Idempotency model (the backbone of reliability)
- Every side-effecting function derives a **deterministic idempotency key** from the source document + transition (e.g. `order:{id}:fulfill`, `po:{id}:line:{ing}:receive:{n}`).
- A guard doc/field (`fulfillment.inventoryExploded`, loyalty txn keyed by order ref, movement keyed by `source.ref`) is checked **inside the transaction**; a duplicate invocation is a no-op.
- This makes Firestore's **at-least-once trigger delivery** safe — retries and duplicate deliveries can never double-count stock or points.

---

## 6. Firestore Trigger Mapping

| Trigger function | Trigger type | Watches (path) | Predicate | Writes to | Idempotency guard |
|---|---|---|---|---|---|
| `fnOrderFulfill` | onDocumentUpdated | `providers/{p}/orders_active/{id}` | status → `completed` (or `ready`, config) | `orders_history`, `stockMovements(out)` | `fulfillment.inventoryExploded` |
| `fnLoyaltyEarn` | onDocumentCreated | `providers/{p}/orders_history/{id}` | has loyalty.accountUid, not accrued | `loyaltyAccounts`, `.../transactions` | txn keyed by order ref |
| `fnRecomputeAvailability` | onDocumentWritten | `providers/{p}/inventory/{item}` | `onHand` crossed threshold | `menu` (availabilityComputed) | change-detect guard |
| `fnRecipeCostRollup` | onDocumentWritten | `recipes/{id}` & `rawIngredients/{id}` & `preparedIngredients/{id}` | cost-relevant fields changed | `recipes.costCache`, `menu.stats` | version + change-detect, cycle guard |
| `fnPrepProduce` | onDocumentUpdated | `providers/{p}/prepTasks/{id}` | status → `done` | `stockMovements(out+in)`, release reservations | `producedMovementId` set |
| `fnStockReserve` | onDocumentUpdated | `providers/{p}/prepTasks/{id}` | status → `in_progress` | `inventory.reserved` | task-state guard |
| `fnClaimsSync` | onDocumentWritten | `providers/{p}/users/{uid}` | `role` changed | Auth custom claims, `userIndex` | claim value compare |
| `fnSessionRollup` | onDocumentWritten | `orders_active/{id}` | sessionId set, totals changed | `tables/{}/sessions` totals | recompute-from-source |

**Collection-group triggers** are avoided where a per-tenant path trigger suffices (cost + blast-radius); cross-tenant batch work is done in scheduled functions instead.

---

## 7. Emulator Strategy

The **Firebase Emulator Suite** is the canonical local + CI environment. No developer or pipeline touches a live project for routine work.

| Emulator | Used for |
|---|---|
| Firestore | rules tests, trigger tests, data fixtures |
| Functions | callable + trigger + scheduled execution locally |
| Auth | sign-in flows, custom claims, anonymous (QR) |
| Storage | image uploads (menu/recipe) |
| Pub/Sub | scheduled + Cloud Tasks fan-out simulation |
| Hosting | serve the built SPA against emulated backend |
| Emulator UI | inspect Firestore state, trigger logs, request traces |

**Strategy**
- **Seed scripts** load deterministic fixtures (a provider, menu, recipes, ingredients, inventory, sample orders) so every run starts from a known state.
- **`firebase.json` emulator config is committed**; one command (`firebase emulators:start --import=./seed --export-on-exit`) gives a full local stack with persistent local data.
- Scheduled functions are **manually triggerable** in the emulator to test reconcilers/rollups without waiting for cron.
- **Rules are tested only against the emulator** via `@firebase/rules-unit-testing` — the regression gate before any rules deploy (per arch doc §6.4).
- The client app points at emulators via an env flag (`VITE_USE_EMULATORS`) so the existing `firebase/firebase.js` init conditionally connects — the single change needed to the current codebase.

---

## 8. Local Development Strategy

- **One-command up:** a `dev` script boots Vite + the full emulator suite with seed import; the SPA auto-connects to emulators.
- **Hot reload both sides:** Vite HMR for the client; functions watch-build (tsc --watch) so trigger/callable changes reload in the Functions emulator.
- **Deterministic data:** seed fixtures are version-controlled; a `reset` script reimports clean state.
- **No shared dev backend:** every developer runs an isolated local stack — eliminates "who broke the dev data" and lets emulator tests run offline/in parallel.
- **Feature flags via provider config** (`providers/{id}` doc) let a developer toggle channels/loyalty without code changes.
- **Secrets locally** come from a git-ignored `.env.local` / emulator config; never real production keys.

---

## 9. Environment Strategy

Three **isolated Firebase projects** (not just config flags) — the only safe boundary for data, auth, and billing.

| Aspect | development | staging | production |
|---|---|---|---|
| Firebase project | `jhigucocina-dev` | `jhigucocina-staging` | `jhigucocina` (existing) |
| Purpose | shared integration sandbox; emulator is primary | pre-prod mirror, QA, UAT, load tests | live |
| Data | disposable, seedable | anonymized prod-like snapshot | real |
| Deploys | auto on merge to `develop` | auto on merge to `main` | manual approval / tag release |
| Functions runtime config | verbose logging, relaxed min-instances | prod-like | warm instances, strict quotas |
| App Check | monitor mode | enforce | enforce |
| Security rules | identical source, deployed per env | identical | identical |
| Custom domain | — | staging subdomain | prod domain |

**Rules**
- **Same source, different project.** Rules, indexes, and functions are deployed from one codebase to each project via CI targets — no per-env code forks.
- **Config via `.firebaserc` aliases** (`dev`/`staging`/`prod`) + per-env runtime config/secrets (Secret Manager). The existing hardcoded `firebaseConfig` in `firebase/firebase.js` becomes **env-driven** (Vite env vars per build target) — a required, backward-compatible change.
- **Promotion path:** code flows dev → staging → prod; data never flows downward except anonymized snapshots into staging.
- **Indexes deploy before functions** in every environment (queries must exist before code that runs them).

---

## 10. CI/CD Architecture

Pipeline stages (GitHub Actions / Cloud Build), gated and reproducible:

```
PR opened ──► [1] Install + typecheck + lint
          ──► [2] Unit tests (domain, shared)              ─┐ fast feedback (<2 min)
          ──► [3] Build client + functions                  │
          ──► [4] Emulator tests (rules + integration)     ─┘ blocking gate
          ──► [5] Preview deploy (Hosting preview channel) → ephemeral URL for review

merge to develop ──► deploy to DEV (indexes → rules → functions → hosting)
merge to main    ──► deploy to STAGING + smoke tests + (optional) load test
tag release vX   ──► manual approval ──► deploy to PROD (canary functions → full)
```

**Principles**
- **Deploy order is always indexes → rules → functions → hosting** (dependencies flow that way; an index or rule must exist before code/clients rely on it).
- **Atomic, reversible deploys:** functions deployed with traffic splitting; a bad release rolls back by shifting traffic to the prior revision (2nd-gen/Cloud Run capability).
- **Rules & indexes are code-reviewed artifacts** (`firestore.rules`, `firestore.indexes.json`) — never edited in the console.
- **No deploy without green emulator tests** (stage 4 is a hard gate).
- **Migrations** (backfills from arch doc §7) run as versioned, idempotent, dry-run-able scripts executed as one-off jobs, tracked in a `migrations` ledger — never ad-hoc.
- **Secrets** via Secret Manager, injected at deploy; never in repo or client bundle.

---

## 11. Testing Architecture

A test pyramid matched to the layered function design:

| Layer | Target | Tooling | Speed | Gate |
|---|---|---|---|---|
| **Unit** | `domain/` + `shared/` pure logic — state machines, BOM explosion, cost/loyalty math, unit conversion | Vitest/Jest, no emulator | ms | every PR |
| **Integration** | entrypoints ↔ Firestore via emulator — transactions, idempotency, trigger fan-out, roll-ups | Emulator + Admin SDK | seconds | every PR |
| **Rules** | `firestore.rules` per security matrix (arch doc §6.3) — tenant isolation, role escalation, ledger immutability, owner reads | `@firebase/rules-unit-testing` | seconds | every PR |
| **E2E (lean)** | critical client journeys (place order → KDS → complete; PO receive → stock; redeem loyalty) | Playwright vs emulator/staging | minutes | pre-release |
| **Load** | rush-hour order/movement throughput, trigger amplification | k6/Artillery vs staging | on demand | pre-release |

**What every workflow test must assert** (because these are the failure modes that hurt in production):
1. **Happy path** transition + correct side effects.
2. **Illegal transition** rejected (state machine guard).
3. **Idempotency:** running the function twice yields one effect.
4. **Authorization:** wrong role / wrong tenant denied.
5. **Atomicity:** a forced mid-transaction failure leaves no partial state.
6. **Reconciliation:** cache (onHand, points balance) equals ledger sum.

Domain logic stays pure precisely so layers 1 (the bulk of tests) run without any Firebase runtime — fast, deterministic, the foundation of the pyramid.

---

## 12. Logging & Monitoring Strategy

### 12.1 Structured logging
- All functions log **structured JSON** via a shared `logger` with a **correlation id** (propagated from the client request through callable → trigger fan-out), `providerId`, `userUid`, `workflow`, `idempotencyKey`, and `outcome`. This lets one customer action be traced across the whole choreography in Cloud Logging.
- **Log levels:** `debug` (dev only), `info` (transitions), `warn` (rejected/illegal transitions, retries), `error` (failures, with stack + context).
- **No PII in logs** beyond uid; no secrets, no card data.

### 12.2 Metrics & dashboards (Cloud Monitoring)
- Per-function: invocation count, error rate, p50/p95/p99 latency, active instances, cold-start rate.
- **Business SLO metrics** emitted as custom metrics: order-transition latency (KDS responsiveness), fulfillment lag (completed → stock decremented), reconciliation drift (cache vs ledger), DLQ depth.
- Dashboards per domain (orders, inventory, loyalty) so on-call sees business impact, not just infra.

### 12.3 Alerting
| Alert | Condition | Severity |
|---|---|---|
| Function error rate spike | >2% over 5 min | page |
| Reconciliation drift | inventory/loyalty cache ≠ ledger beyond tolerance | page |
| DLQ growth | dead-letter depth > 0 sustained | page |
| Trigger amplification | invocations/min above baseline (loop guard) | page |
| Latency SLO breach | order-transition p95 > target | warn |
| Quota approach | Firestore/Functions usage nearing limit | warn |

### 12.4 Error reporting
- Cloud Error Reporting groups exceptions; release version tagged so regressions are attributable to a deploy.
- Crashlytics/Sentry on the client correlates UI errors to backend correlation ids.

---

## 13. Error Handling Strategy

### 13.1 Typed error taxonomy (`shared/errors.ts`)
| Error class | Maps to HttpsError | Client treatment | Retryable |
|---|---|---|---|
| `ValidationError` | `invalid-argument` | show field error | no |
| `AuthzError` | `permission-denied` | `<AccessDenied/>` | no |
| `IllegalTransitionError` | `failed-precondition` | snap-back optimistic UI, toast | no |
| `ConflictError` (version/contention) | `aborted` | auto-retry with backoff | yes (bounded) |
| `NotFoundError` | `not-found` | toast / refresh | no |
| `DependencyError` (downstream) | `unavailable` | retry / queue | yes |
| `InternalError` | `internal` | generic toast + report | depends |

### 13.2 Failure handling principles
- **Transactional all-or-nothing:** side effects commit atomically; a failure rolls the whole transaction back — no partial inventory/loyalty state (tested in §11).
- **Retry with idempotency:** transient failures (`ConflictError`, contention) retry with exponential backoff; idempotency keys make retries safe.
- **Dead-letter queue:** trigger/queue functions that exhaust retries route the event to a **DLQ** (Pub/Sub dead-letter topic) for inspection + manual replay — events are never silently dropped.
- **Compensating actions, not edits:** ledger corrections are new compensating entries (per data model), so a failed/partial workflow is corrected forward, never by mutating history.
- **Graceful client degradation:** offline persistence (Document A) + queued mutations mean a kitchen tablet keeps working through a backend blip and reconciles on reconnect.
- **Self-healing:** scheduled reconcilers (`fnInventoryReconcile`, `fnLoyaltyReconcile`) detect and repair drift caused by any missed/duplicated event.

---

## 14. Cost Optimization Strategy

Firestore + Functions bill on **operations, invocations, and compute-time**, so cost discipline is an architecture concern, not an afterthought.

### Firestore
- **Hot/cold split** (existing `orders_active`/`orders_history`, generalized) keeps live queries small and indexed reads cheap.
- **Denormalized caches** (`onHand`, `pointsBalance`, `stats`, analytics rollups) mean dashboards read *one* doc instead of aggregating thousands — the single biggest read-cost lever.
- **Precomputed analytics** (scheduled rollups + BigQuery export for deep queries) — never pay for ad-hoc client-side aggregation.
- **Narrow listeners:** realtime only where required (KDS, prep, floor map, own orders); everything else uses cached fetch with manual/interval refresh.
- **Bounded documents & pagination:** virtualized grids fetch pages mapped to composite indexes, not whole collections.
- **TTL policies** on `analytics/events` (post-export) and archived data to cap storage.

### Functions
- **2nd-gen concurrency** (many requests per instance) slashes per-request compute cost vs 1st-gen's one-per-instance.
- **`maxInstances` caps** prevent runaway scale-out (also protects Firestore).
- **Warm `minInstances` only during service hours** (scheduled scale-to-zero overnight) — pay for warmth only when the kitchen is open.
- **Narrow triggers + change predicates** so functions don't fire on irrelevant writes.
- **Batch scheduled work** (one nightly rollup pass) instead of per-event recompute where latency allows.
- **Offload slow/fan-out work to Cloud Tasks/Pub-Sub** so hot callables stay short (compute-time billed).

### Guardrails
- Billing budget alerts per environment; cost attribution by function via labels.
- Load tests in staging measure cost-per-order before features ship, so cost regressions are caught pre-prod.

---

## 15. Per-Workflow Operational Map

Consolidated view tying every Document C workflow to its infrastructure, with **failure recovery** made explicit.

| Workflow | Trigger source | Function owner(s) | Firestore collections affected | Failure recovery strategy |
|---|---|---|---|---|
| **Order lifecycle** | Staff (KDS) callable; System for auto-complete | `fnOrderTransition` → `fnOrderFulfill` | `orders_active`, `orders_history`, `stockMovements`, `counters` | Transactional move; `inventoryExploded` idempotency; trigger retry on transient; DLQ on exhaustion; `fnInventoryReconcile` repairs missed decrements |
| **Order-item lifecycle** | Staff (station KDS) callable | `fnOrderItemTransition` → `fnOrderTransition` | `orders_active.items[]` | Roll-up recomputed from source items (self-correcting); illegal line moves rejected + snap-back |
| **Inventory lifecycle** | Function-reaction (#order/#po/#prep) + Staff/Manager callable | `fnStockMovementApply`, `fnRecomputeAvailability`, `fnInventoryReconcile` | `inventory`, `inventory/{}/stockMovements`, `menu` | Append-only ledger (immutable); cache rebuilt from ledger nightly; movements idempotent on `source.ref`; corrections via compensating movements |
| **Purchase-order lifecycle** | Manager callable; System (reorder) | `fnPoTransition`, `fnPoReceive`, `fnReorderSuggest` | `purchaseOrders`, `stockMovements(in)`, `rawIngredients.cost` | Receive is atomic (movement+cost+line); idempotent per line-receipt; partial receipts resumable; failed receive leaves PO unchanged |
| **Prepared-ingredient lifecycle** | Staff callable (board); System (par suggest) | `fnPrepTaskTransition` → `fnPrepProduce`, `fnPrepSuggest`, `fnPrepArchive` | `prepTasks`, `inventory` (reserve + movements), `preparedIngredients` | `producedMovementId` idempotency; reservations released on cancel/failure; orphaned reservations swept by reconciler; archive is replayable |
| **Loyalty lifecycle** | Function-reaction (order completed); Customer/Manager callable; System (expiry) | `fnLoyaltyEarn`, `fnLoyaltyRedeem`, `fnLoyaltyAdjust`, `fnLoyaltyExpire`, `fnLoyaltyReconcile` | `loyaltyAccounts`, `.../transactions`, order pricing | Append-only ledger; earn idempotent per order; redeem validates balance in-txn; balance rebuilt from ledger by reconciler; drift alerts |
| **Staff assignment lifecycle** | Manager callable (DnD) | `fnStaffAssign` | `users.staff`, `prepTasks.assignedToUid` | Eligibility/double-booking checked in-txn; rejected assignments surfaced to UI; clock-out cascade is idempotent; low blast radius (no financial/physical state) |
| **Identity/claims** | Auth trigger + `users.role` write | `fnClaimsSync`, `fnUserProvision` | Auth custom claims, `users`, `userIndex` | Claim compare avoids redundant sets; on failure user keeps prior claims; reconciled on next role write or scheduled sweep |
| **Analytics** | Scheduled + downstream triggers | `fnAnalyticsRollup`, `fnBigQueryExport` | `analytics/**` | Rollups recomputable from `orders_history`/ledgers (idempotent, re-runnable for any date); export marks `exported` flag; failed export retried, never double-counted |

---

## 16. Production-Readiness Checklist (summary)

- ✅ Three isolated environments, same source, alias-driven deploys.
- ✅ Functions layered (entrypoint/domain/data); domain is pure + fully unit-tested.
- ✅ Every side effect transactional + idempotent; at-least-once delivery is safe.
- ✅ Choreographed triggers with loop/amplification guards and DLQs.
- ✅ Rules/indexes are reviewed code, deployed before dependent code, emulator-gated.
- ✅ Self-healing reconcilers for every denormalized cache.
- ✅ Structured logging with cross-fan-out correlation ids; SLO dashboards + paging alerts.
- ✅ Cost controlled by hot/cold split, denormalized reads, capped/concurrent functions, scheduled warmth.
- ⏳ `[PRD-TBD]`: region pinning, payment-webhook provider, decrement-timing config, loyalty/tax parameters.

---

*End of Document D. Next concrete deliverables (still pre-feature-code): `firebase.json` + `.firebaserc` env aliases, `firestore.rules`, `firestore.indexes.json`, the `functions/` skeleton scaffold (empty entrypoints per §2), seed fixtures, and the CI workflow definition.*
