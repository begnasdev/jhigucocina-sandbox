/**
 * PURPOSE
 *   Typed error taxonomy mapped to Firebase HttpsError codes (Document D §13.1).
 *
 * EXPLANATION
 *   A single error vocabulary so callables return predictable codes the client
 *   can render (validation -> field error, authz -> AccessDenied, illegal
 *   transition -> snap-back, etc.). Sprint 1 defines the taxonomy; handlers
 *   throw NotImplementedError until their workflow sprint lands.
 *
 * DEPLOYMENT
 *   Library module, built with `npm run build`.
 */

import { HttpsError, type FunctionsErrorCode } from "firebase-functions/v2/https";

export class AppError extends Error {
  constructor(
    public readonly code: FunctionsErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
  toHttps(): HttpsError {
    return new HttpsError(this.code, this.message, this.details);
  }
}

export class ValidationError extends AppError {
  constructor(m: string, d?: unknown) { super("invalid-argument", m, d); }
}
export class AuthzError extends AppError {
  constructor(m = "Permission denied") { super("permission-denied", m); }
}
export class IllegalTransitionError extends AppError {
  constructor(m: string, d?: unknown) { super("failed-precondition", m, d); }
}
export class ConflictError extends AppError {
  constructor(m = "Write conflict, retry") { super("aborted", m); }
}
export class NotFoundError extends AppError {
  constructor(m = "Not found") { super("not-found", m); }
}
export class DependencyError extends AppError {
  constructor(m = "Dependency unavailable") { super("unavailable", m); }
}
export class NotImplementedError extends AppError {
  constructor(m = "Not implemented in Sprint 1") { super("unimplemented", m); }
}

/** Normalize any thrown value into an HttpsError for the client. */
export function mapError(e: unknown): HttpsError {
  if (e instanceof AppError) return e.toHttps();
  if (e instanceof HttpsError) return e;
  return new HttpsError("internal", "Internal error");
}
