# Integration tests (functions ↔ emulator)

**PURPOSE:** Verify entrypoints against the Firestore + Functions emulators —
transactions, idempotency, trigger fan-out, roll-ups (Document D §11).

**EXPLANATION:** These run with the Emulator Suite up. Every workflow added in
later sprints must assert the six required properties (Document D §11):
1. happy-path transition + side effects
2. illegal transition rejected
3. idempotency (run twice → one effect)
4. authorization (wrong role / wrong tenant denied)
5. atomicity (forced mid-txn failure → no partial state)
6. reconciliation (cache == ledger sum)

Sprint 1 has no workflows, so there are no integration tests yet — only this
contract. Adding the first one is part of the Orders sprint.

**DEPLOYMENT / RUN:**
```
firebase emulators:exec --project jhigucocina-dev "npm run test:integration"
```
Runs in CI after unit tests (blocking gate).
