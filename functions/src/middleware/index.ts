/**
 * PURPOSE
 *   Callable middleware pipeline (Document D §4): App Check -> Auth -> Authz ->
 *   Validation -> Idempotency -> Tracing -> handler -> error mapping.
 *
 * EXPLANATION
 *   Wraps an onCall handler so every sensitive callable enforces the same
 *   cross-cutting guarantees. Sprint 1 ships the composition + the auth/authz/
 *   tracing/error wiring (real, working). App Check enforcement and idempotency
 *   claiming are stubbed to pass-through with TODO markers and activate in later
 *   sprints — no business logic is executed.
 *
 * DEPLOYMENT
 *   Library module, built with `npm run build`.
 */

import type { CallableRequest } from "firebase-functions/v2/https";
import { z, type ZodTypeAny } from "zod";
import { AuthzError, ValidationError, mapError } from "../shared/errors.js";
import { createLogger } from "../shared/logger.js";

export type Role = "customer" | "staff" | "manager" | "admin";

export interface AuthedContext<T> {
  data: T;
  uid: string;
  providerId: string;
  role: Role;
  correlationId: string;
  log: ReturnType<typeof createLogger>;
}

export interface GuardOptions<T> {
  schema?: ZodTypeAny;
  /** Minimum role required. Owner-checks are done inside the handler. */
  minRole?: Role;
  /** Require App Check token (anti-abuse, esp. public QR surface). */
  requireAppCheck?: boolean;
  workflow: string;
}

const ROLE_RANK: Record<Role, number> = {
  customer: 0, staff: 1, manager: 2, admin: 3,
};

/**
 * Compose a guarded onCall handler. Returns a function suitable for onCall().
 */
export function guarded<T, R>(
  opts: GuardOptions<T>,
  handler: (ctx: AuthedContext<T>) => Promise<R>,
) {
  return async (req: CallableRequest): Promise<R> => {
    const correlationId =
      (req.data?.correlationId as string) ?? crypto.randomUUID();
    const log = createLogger({ correlationId, workflow: opts.workflow });

    try {
      // 1. App Check (anti-abuse). Enforced in staging/prod from Sprint 2.
      if (opts.requireAppCheck && !req.app) {
        // TODO(sprint2): throw AuthzError once clients send App Check tokens.
        log.warn("Missing App Check token (allowed in Sprint 1)");
      }

      // 2. Auth
      if (!req.auth) throw new AuthzError("Authentication required");
      const token = req.auth.token as Record<string, unknown>;
      const uid = req.auth.uid;
      const providerId = String(token.providerId ?? "");
      const role = (token.role as Role) ?? "customer";
      if (!providerId) throw new AuthzError("Missing provider claim");

      // 3. Authz (role floor)
      if (opts.minRole && ROLE_RANK[role] < ROLE_RANK[opts.minRole]) {
        throw new AuthzError(`Requires role >= ${opts.minRole}`);
      }

      // 4. Validation
      let data = req.data as T;
      if (opts.schema) {
        const parsed = opts.schema.safeParse(req.data);
        if (!parsed.success) {
          throw new ValidationError("Invalid input", parsed.error.format());
        }
        data = parsed.data as T;
      }

      // 5. Idempotency — claimed inside the handler's transaction (Sprint 2+).
      // 6. Tracing
      const ctx: AuthedContext<T> = {
        data, uid, providerId, role, correlationId,
        log: log.child({ providerId, userUid: uid }),
      };
      ctx.log.info("callable.start");
      const result = await handler(ctx);
      ctx.log.info("callable.ok");
      return result;
    } catch (e) {
      log.error("callable.error", { message: (e as Error).message });
      throw mapError(e);
    }
  };
}

export { z };
