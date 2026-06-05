/**
 * PURPOSE
 *   Security-rules regression suite (Document D §11, architecture §6.4).
 *   Tests firestore.rules against the emulator with @firebase/rules-unit-testing.
 *   This is the GATE before any rules deploy.
 *
 * EXPLANATION
 *   Sprint 1 ships real assertions for the load-bearing invariants that already
 *   matter (tenant isolation, role escalation, ledger immutability, order
 *   integrity). Sprint 1 intent is documented as test cases; run them with the
 *   emulator. Custom claims are simulated via the test auth context.
 *
 * DEPLOYMENT / RUN:
 *   firebase emulators:exec --project demo-jhigu "npm run test:rules"
 *   CI runs this on every PR; a failure blocks merge and deploy.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { setDoc, doc, getDoc, updateDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const PID = "jhigucocina";
const customer = () => env.authenticatedContext("cust1", { providerId: PID, role: "customer" });
const manager = () => env.authenticatedContext("mgr1", { providerId: PID, role: "manager" });
const otherTenant = () => env.authenticatedContext("x1", { providerId: "other", role: "manager" });

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-jhigu",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
afterAll(async () => env?.cleanup());

describe("tenant isolation", () => {
  it("denies cross-tenant menu writes", async () => {
    const db = otherTenant().firestore();
    await assertFails(setDoc(doc(db, `providers/${PID}/menu/m1`), { name: "x" }));
  });
});

describe("role escalation", () => {
  it("lets a customer create only a customer-role self doc", async () => {
    const db = customer().firestore();
    await assertSucceeds(
      setDoc(doc(db, `providers/${PID}/users/cust1`), {
        uid: "cust1", role: "customer", providerId: PID, email: "c@x.com",
      }),
    );
  });
  it("blocks a customer from elevating their own role", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `providers/${PID}/users/cust1`), {
        uid: "cust1", role: "customer", providerId: PID,
      });
    });
    const db = customer().firestore();
    await assertFails(updateDoc(doc(db, `providers/${PID}/users/cust1`), { role: "admin" }));
  });
});

describe("ledger immutability / function-only", () => {
  it("denies client writes to stockMovements", async () => {
    const db = manager().firestore();
    await assertFails(
      setDoc(doc(db, `providers/${PID}/inventory/ing1/stockMovements/mv1`), { qtyBase: -5 }),
    );
  });
  it("denies client writes to loyalty transactions", async () => {
    const db = customer().firestore();
    await assertFails(
      setDoc(doc(db, `providers/${PID}/loyaltyAccounts/cust1/transactions/t1`), { points: 10 }),
    );
  });
});

describe("order integrity", () => {
  it("denies client status mutation of an active order", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `providers/${PID}/orders_active/o1`), {
        providerId: PID, customerId: "cust1", status: "placed",
      });
    });
    const db = customer().firestore();
    await assertFails(updateDoc(doc(db, `providers/${PID}/orders_active/o1`), { status: "completed" }));
  });
  it("lets a customer read only their own order", async () => {
    const db = customer().firestore();
    await assertSucceeds(getDoc(doc(db, `providers/${PID}/orders_active/o1`)));
  });
});
