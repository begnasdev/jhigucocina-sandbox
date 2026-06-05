# Seed Data Architecture

**PURPOSE:** Deterministic fixtures so every local/dev run starts from a known
state (Document D §7–§8): roles/permissions, a sample provider, one user per
role, a small menu, and baseline inventory.

**EXPLANATION:** Files are split by concern and loaded by `seed.mjs` via the
Admin SDK (bypasses rules). Custom claims `{providerId, role}` are set on each
user — the same claims the security rules read and `fnClaimsSync` sets in prod.
No ledger entries are seeded (stockMovements / loyalty transactions are
Function-only and append-only); inventory `onHand` is an opening baseline.

| File | Seeds |
|---|---|
| `roles.json` | role hierarchy + permission matrix (reference + claims source) |
| `data/provider.json` | `providers/jhigucocina` config |
| `data/users.json` | Auth users + `users/{uid}` docs, one per role |
| `data/menu.json` | `menuCategories` + `menu` items |
| `data/inventory.json` | `vendors`, `rawIngredients`, `inventory` caches |

## Sample logins (emulator only)
`admin@ / manager@ / staff@ / customer@jhigucocina.test` — password `Passw0rd!`

## Run

```bash
# Safe default: against the Emulator Suite
firebase emulators:exec --project jhigucocina-dev "node seed/seed.mjs"

# Or with emulators already running + exported data:
firebase emulators:start --import=./seed/.exported --export-on-exit
node seed/seed.mjs        # in another shell (emulator host env vars set by CLI)
```

**GUARD:** `seed.mjs` refuses to run against the production project id. Never
seed users into production.

## Deployment note
Seeding is a **development/staging** activity only. Staging is populated from
anonymized prod-like snapshots (Document D §9), not from this fixture set.
