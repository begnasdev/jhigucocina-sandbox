# Document B — JhiguCocina Design System

**Status:** Design only (no implementation code)
**Date:** 2026-06-05
**Companion to:** `docs/firestore-architecture.md`, `docs/A-frontend-architecture.md`
**Scope:** Tokens, components, and patterns for a system spanning customer-facing ordering and dense back-of-house operations tooling.

> **Design tension to resolve up front.** JhiguCocina has two audiences with opposite needs: (1) **customers** on phones who need warmth, clarity, and big touch targets, and (2) **operators** (kitchen, prep, inventory, purchasing) on tablets/desktops who need information density, fast scanning, and glanceability across a noisy kitchen. The system handles this with **one token foundation** but **two density modes** (`comfortable` for customer, `compact` for ops) and a deliberate **dark-first** posture for kitchen surfaces.

All tokens are defined as **CSS custom properties** under a theme root (consumed by `ui/theme/`), so dark mode and density are runtime class swaps, not rebuilds.

---

## 1. Typography Scale

A single **modular scale (ratio 1.25 / major third)** anchored at a 16px base. Two font roles: a **UI/sans** for everything functional, and an optional **display** face for customer marketing surfaces only.

| Token | rem / px | Line height | Weight | Usage |
|---|---|---|---|---|
| `font-display` | 3.052rem / 49px | 1.1 | 700 | Customer hero only |
| `font-h1` | 2.441rem / 39px | 1.15 | 700 | Page titles (customer) |
| `font-h2` | 1.953rem / 31px | 1.2 | 600 | Section headers |
| `font-h3` | 1.563rem / 25px | 1.25 | 600 | Card/panel titles |
| `font-h4` | 1.25rem / 20px | 1.3 | 600 | Sub-sections, KDS card header |
| `font-body-lg` | 1.125rem / 18px | 1.5 | 400 | Customer body, item descriptions |
| `font-body` | 1rem / 16px | 1.5 | 400 | Default body |
| `font-body-sm` | 0.875rem / 14px | 1.45 | 400 | Dense tables, metadata |
| `font-caption` | 0.75rem / 12px | 1.4 | 500 | Labels, badges, timestamps |
| `font-mono` | 0.875rem / 14px | 1.45 | 500 | Quantities, SKUs, money, order #s |

### Rules
- **Mono for numbers that align.** Inventory quantities, prices, order numbers, and PO totals use `font-mono` with tabular figures so columns line up — critical for the inventory/PO grids.
- **Density modifier:** `compact` mode drops body to 14px and tightens line-height to 1.4; `comfortable` keeps 16px/1.5. One class on the surface root.
- **Max two type families** to keep the operations bundle small; display face lazy-loads only on customer marketing routes.
- Type tokens are **semantic, not sized** at call sites — components reference `font-h3`, never `31px`.

---

## 2. Color System

Three layers: **brand → semantic → surface**. Components only ever consume **semantic** and **surface** tokens, so retheming (or a second tenant's branding via `provider.branding`) never touches component code.

### 2.1 Brand (raw palette)
Seeded from the existing `providerConfig` accent `#B5121B` (a warm Mexican-kitchen red).

| Brand token | Light value | Note |
|---|---|---|
| `brand-primary` | `#B5121B` | JhiguCocina red (from existing branding) |
| `brand-primary-emphasis` | `#8E0E15` | Hover/pressed |
| `brand-accent` | `#F2A900` | Warm amber (pineapple/heat) |
| `brand-neutral-0..1000` | `#FFFFFF … #0A0A0B` | 11-step gray ramp |

> Per-tenant override: `provider.branding.primaryColor` maps onto `brand-primary` at runtime; the ramp stays fixed for contrast safety.

### 2.2 Semantic tokens (what components use)

| Semantic token | Light | Dark | Meaning |
|---|---|---|---|
| `color-bg` | neutral-0 | neutral-1000 | App background |
| `color-surface` | neutral-0 | neutral-900 | Cards, panels |
| `color-surface-raised` | neutral-50 | neutral-800 | Modals, popovers, board cards |
| `color-border` | neutral-200 | neutral-700 | Dividers, table lines |
| `color-text` | neutral-900 | neutral-50 | Primary text |
| `color-text-muted` | neutral-600 | neutral-400 | Secondary/meta |
| `color-primary` | brand-primary | lightened brand | CTAs, active nav |
| `color-on-primary` | white | near-black | Text on primary |
| `color-focus-ring` | brand-primary @ 40% | accent @ 50% | Focus outline |

### 2.3 Status colors (shared with all state machines)
These map **1:1 to the workflow states in Document C** so a color means the same thing on the KDS card, the order timeline, the PO list, and the inventory badge. This is the system's most important consistency contract.

| Status token | Hue | Used by (state) |
|---|---|---|
| `status-neutral` | slate | placed / todo / draft |
| `status-info` | blue | accepted / submitted / in_progress |
| `status-active` | amber | preparing / partial / low-stock |
| `status-ready` | teal | ready |
| `status-success` | green | completed / received / done / in-stock |
| `status-danger` | red | cancelled / void / out-of-stock |
| `status-warning` | orange | waste / expiring / reorder-point |

Each ships as `-bg`, `-fg`, `-border` triplets tuned for both themes to guarantee **WCAG AA contrast** in light and dark.

### Rules
- **Never hardcode hex in components.** Only semantic/status tokens.
- **Color is never the only signal** — status always pairs with an icon + label (kitchen is noisy and colorblind-inclusive).
- Status tokens are the single source for badges, board columns, timelines, and chart series.

---

## 3. Spacing System

A **4px base grid**, exposed as a `space-*` scale. Two density modes scale the *component* paddings, not the grid.

| Token | px | Typical use |
|---|---|---|
| `space-0` | 0 | reset |
| `space-1` | 4 | icon gaps, badge padding |
| `space-2` | 8 | tight stacks, table cell padding (compact) |
| `space-3` | 12 | input padding, table cell (comfortable) |
| `space-4` | 16 | default gap, card padding (compact) |
| `space-5` | 24 | card padding (comfortable), section gaps |
| `space-6` | 32 | panel padding |
| `space-8` | 48 | page gutters (desktop) |
| `space-10` | 64 | hero spacing (customer) |

Companion scales (also tokenized): **radius** (`radius-sm 6 / md 10 / lg 16 / full`), **elevation** (`shadow-1..4`, suppressed in dark mode in favor of border + surface lift), **z-index** (`z-nav / z-dropdown / z-drag / z-modal / z-toast` — `z-drag` sits above content but below modals so dragged kanban cards float correctly).

### Rules
- **All layout spacing references tokens**, never raw px.
- **Density is a surface-level switch:** ops tables/boards run `compact`; customer screens run `comfortable`.
- 8px rhythm vertically between stacked elements; 16/24 between groups.

---

## 4. Reusable UI Components (`ui/primitives`)

The base kit every module composes from. All are theme- and density-aware, keyboard-accessible, and status-token-driven.

| Component | Key variants / props | Notes |
|---|---|---|
| `Button` | primary / secondary / ghost / danger; sizes sm–lg; loading; icon | Min 44px touch target in `comfortable`. |
| `IconButton` | same variants | For dense toolbars (KDS bump, table actions). |
| `Input` / `NumberInput` | text/number/search; prefix/suffix; error | `NumberInput` uses mono + step controls (quantities). |
| `Select` / `Combobox` | searchable, async, multi | Combobox virtualized for ingredient/vendor pickers. |
| `Checkbox` / `Radio` / `Switch` | — | Switch used for menu `available` 86-toggle. |
| `Badge` / `StatusPill` | takes a `status` token | The canonical state renderer (icon + label + color). |
| `Tag` / `Chip` | removable; draggable variant | Used in recipe builder & staff assignment DnD. |
| `Card` | header/body/footer; raised; interactive | Base for board cards, dashboard tiles. |
| `Modal` / `Drawer` / `Popover` | sizes; focus-trapped | Drawer for item detail / session detail. |
| `Toast` | status variants; action | Global channel; mutation feedback. |
| `Tabs` / `SegmentedControl` | — | KDS view switch (status vs station). |
| `Tooltip` | — | Truncated cells, icon-only actions. |
| `Avatar` / `AvatarStack` | staff initials/photo | Staff assignment chips. |
| `Skeleton` / `Spinner` / `EmptyState` | — | Standard loading/empty across all grids/boards. |
| `Money` | value(minor) + currency | Formats via `lib/money` + `provider.locale`. |
| `Quantity` | value + unit | Formats via `lib/units` (base/purchase). |

**Composition rule:** modules never build raw inputs/buttons; they compose primitives. This is what keeps eight modules visually coherent.

---

## 5. Dashboard Components (`ui/data`)

For Analytics and the per-module overview screens.

| Component | Purpose |
|---|---|
| `StatCard` | Single KPI: value, label, delta (▲/▼ vs prior period), sparkline. Reads from `analytics/daily` rollups. |
| `StatGrid` | Responsive grid of StatCards (auto-fit, min 220px). |
| `TrendChart` | Line/area over time (revenue, covers, food-cost %). Series colored by status tokens. |
| `BreakdownChart` | Bar/donut for categorical mix (channel mix, top items). |
| `LeaderboardTable` | Ranked list (top menu items from `analytics/menuItems`). |
| `ComparisonBar` | Theoretical vs actual (food cost, par vs on-hand). |
| `DateRangePicker` | Drives which rollup docs are read (day/week/month). |
| `ExportButton` | Links to BigQuery/CSV for deep analysis (rollups only on screen). |

**Rule:** dashboard components **only consume precomputed rollups** (arch doc §4.13). No client-side aggregation over raw collections — this is a hard scalability boundary.

---

## 6. Inventory Management Tables (`ui/data` — table family)

The densest surface in the product. A configurable `DataGrid` powers inventory, movements, POs, vendors, and user lists.

### `DataGrid` capabilities
- **Virtualized rows** (thousands of ingredients/movements without lag).
- **Sticky header + sticky first column** (item name stays visible while scrolling cost/qty columns).
- **Column types:** text, `Money`, `Quantity` (mono, right-aligned, tabular), `StatusPill`, delta, actions.
- **Inline edit** for permitted fields (par level, reorder point) — manager only; ledger fields are read-only by design.
- **Row affordances:** expand-to-detail (movement ledger drawer), multi-select (bulk actions), low-stock row tint (`status-active`/`status-danger`).
- **Server-driven** sort/filter/paginate mapped to the composite indexes in the arch doc (e.g. `lowStock + itemKind`), never client-side over full collections.

### Specialized table presets
| Preset | Columns (illustrative) | Key behavior |
|---|---|---|
| **Stock-on-hand** | Item · Kind · On-hand · Reserved · Available · Par · Cost · Value · Status | Low-stock tint; expand → ledger. |
| **Movement ledger** | Time · Type · Δ Qty · Balance after · Source · Actor | Append-only, read-only; type-colored. |
| **PO lines** | Ingredient · Ordered · Received · Unit price · Line total | Editable in draft; receiving mode shows received input. |
| **Vendor price list** | Ingredient · SKU · Pack · Pack→base · Pack price · /base | Per-vendor; feeds reorder cost. |

**Rule:** numeric columns are mono, right-aligned, tabular; quantities always show their unit via `Quantity`; money always via `Money`.

---

## 7. Kanban Board Patterns (`ui/board`)

One board engine, many configurations — used by KDS, prep line, and (column-less variant) staff assignment. Pairs with the shared DnD abstraction in Document A §7.

### Primitives
| Primitive | Role |
|---|---|
| `Board` | Horizontal scroll container; owns the `DndProvider`, density, virtualization. |
| `BoardColumn` | A status/station lane: header (title + count + WIP indicator), droppable body, optional footer. |
| `BoardCard` | Draggable card; status accent stripe; compact + expanded states. |
| `BoardSwimlane` | Optional horizontal grouping (e.g. station rows crossing status columns). |
| `CardGhost` | Drag preview (floats at `z-drag`). |
| `DropIndicator` | Insertion-point affordance for keyboard + pointer. |

### Board presets
| Board | Columns | Card | Drop meaning |
|---|---|---|---|
| **KDS** | order statuses (or station swimlanes) | order/item: number, items, age timer, table/channel | state transition (server-validated) |
| **Prep line** | todo / in_progress / done per station | prep task: target qty, recipe, assignee, priority | task status transition |
| **Staff assignment** | stations/lanes + roster | staff avatar chip | assign / reassign / unassign |

### Patterns & rules
- **Age/SLA coloring:** KDS cards shift accent toward `status-warning`/`status-danger` as they age past thresholds — glanceable triage.
- **WIP counts** in every column header (kitchen capacity awareness).
- **Optimistic move + snap-back** on rejected transitions (illegal state machine moves bounce).
- **Keyboard-operable** (pick up / move / drop) for accessibility and speed.
- **Bounded data:** boards only render hot collections (`orders_active`, today's `prepTasks`) so they never degrade.

---

## 8. Responsive Strategy

**Breakpoints** (tokenized): `xs <480` (phone), `sm 480–768` (large phone), `md 768–1024` (tablet — *primary kitchen device*), `lg 1024–1440` (desktop), `xl >1440` (ops workstation / wall display).

| Surface | Primary device | Strategy |
|---|---|---|
| Customer | phone (`xs/sm`) | **Mobile-first**, single column, large touch targets, bottom action bar (cart/checkout), thumb-reachable nav. |
| KDS | tablet/wall (`md/xl`) | **Desktop-first board**; columns scroll horizontally on `md`, fan out on `xl`; never collapses to one column (defeats the purpose). |
| Prep / Dine-in floor | tablet (`md`) | Board + drawer detail; floor map scales to viewport with pan/zoom on `xs`. |
| Inventory / Purchasing / Analytics | desktop (`lg`) | Dense grids; on `md` columns become horizontally scrollable with a sticky item column; on `xs` collapse to stacked **cards** (label:value pairs) — never a cramped table. |

### Rules
- **Layout primitives** (`Stack`, `Cluster`, `Grid`, `Page`) own all responsive behavior; screens compose them, no ad-hoc media queries.
- **Table → card collapse** is the standard pattern for dense grids on small screens.
- **Density follows device**, not just user: ops surfaces default `compact` on `lg+`, `comfortable` (bigger touch) on `md` tablets.
- Touch targets ≥44px on any touch-capable surface regardless of density.

---

## 9. Dark Mode Strategy

**Dark-first for back-of-house, light-default for customer.** Kitchens are often dim, screens run for full shifts (burn-in / eye strain), and dark reduces glare — so KDS, prep, inventory, dine-in, and analytics default to dark; the customer app defaults to light. Both fully support either via `ThemeContext`.

### Approach
- **Token-driven, not duplicated styles.** Every semantic/status token has a light and dark value (§2). Switching theme swaps a single root class — zero component changes.
- **Source of truth:** `ThemeContext` resolves in order → explicit user choice (persisted) → module default (ops=dark, customer=light) → OS `prefers-color-scheme`.
- **Dark-mode specifics:**
  - Elevation via **surface lightening + borders**, not shadows (shadows read poorly on dark).
  - **Desaturate large fills** of status colors to avoid vibration; keep accents saturated for small badges.
  - Maintain **WCAG AA** in both themes — status triplets are tuned per theme, not algorithmically inverted.
  - **No pure black/white** (`neutral-1000`/`neutral-0` are near-black/near-white) to reduce halation on bright kitchen displays.
  - Charts swap to dark-tuned series + gridlines via the same status tokens.
- **Wall-display variant:** an optional high-contrast dark profile for far-viewing KDS screens (larger type step, bolder status fills).

### Rules
- Components **must not** branch on theme in JS — they read tokens; the theme layer decides values.
- Test every component in **light + dark × comfortable + compact** (4 combinations) as the visual-regression gate.

---

## 10. Governance

- **Tokens are the contract.** New colors/spacing/type go through the token layer, never inline. PRs adding raw hex/px to a component are rejected.
- **Primitives before patterns before screens.** Build `ui/primitives` → `ui/data`/`ui/board` → module screens. Modules never reach below their layer.
- **Accessibility is a token + primitive responsibility**, so it's correct everywhere by default (focus rings, contrast, touch targets, keyboard DnD).
- **One status vocabulary** (§2.3) shared by every state machine in Document C — the visual glue across the whole product.

---

*End of Document B.*
