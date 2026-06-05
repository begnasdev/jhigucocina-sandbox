/**
 * PURPOSE
 *   Unit-test layer example (Document D §11). Tests PURE domain/shared logic
 *   with NO emulator — fast, deterministic, the base of the pyramid.
 *
 * EXPLANATION
 *   Sprint 1 ships one real unit test over the state-machine guard to prove the
 *   test harness + the canTransition contract. Workflow sprints add the bulk:
 *   BOM explosion, cost/loyalty math, unit conversion, roll-ups.
 *
 * DEPLOYMENT
 *   Run: `npm test` (in functions/). Runs in CI on every PR (blocking gate).
 */

import { describe, it, expect } from "vitest";
import { canTransition, orderMachine } from "../../src/shared/stateMachines/index.js";

describe("order state machine", () => {
  it("allows the forward flow", () => {
    expect(canTransition(orderMachine, "placed", "accepted")).toBe(true);
    expect(canTransition(orderMachine, "ready", "completed")).toBe(true);
  });
  it("rejects skipping states", () => {
    expect(canTransition(orderMachine, "placed", "completed")).toBe(false);
  });
  it("allows cancel from any non-terminal state", () => {
    expect(canTransition(orderMachine, "preparing", "cancelled")).toBe(true);
  });
  it("treats completed/cancelled as terminal", () => {
    expect(canTransition(orderMachine, "completed", "ready")).toBe(false);
    expect(canTransition(orderMachine, "cancelled", "placed")).toBe(false);
  });
});
