/**
 * PURPOSE
 *   Integer minor-unit money math (mirrors the client lib/money).
 *
 * EXPLANATION
 *   firestore-architecture.md §4 stores new money fields as integer minor units
 *   (e.g. cents) to avoid float drift. This module centralizes the math so
 *   server and client agree. Sprint 1: pure helpers, no business rates.
 *
 * DEPLOYMENT
 *   Pure library, built with `npm run build`. Independently unit-tested (§11).
 */

export type Minor = number; // integer minor units

export function toMinor(major: number): Minor {
  return Math.round(major * 100);
}
export function toMajor(minor: Minor): number {
  return minor / 100;
}
export function sumMinor(values: Minor[]): Minor {
  return values.reduce((a, b) => a + b, 0);
}
export function pct(amount: Minor, percent: number): Minor {
  return Math.round((amount * percent) / 100);
}
