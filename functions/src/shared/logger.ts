/**
 * PURPOSE
 *   Structured logging wrapper with correlation context (Document D §12.1).
 *
 * EXPLANATION
 *   Every log line is JSON carrying correlationId, providerId, userUid,
 *   workflow, idempotencyKey, outcome — so one customer action can be traced
 *   across the callable -> trigger fan-out in Cloud Logging. No PII beyond uid;
 *   no secrets. Sprint 1 provides the interface + child-context pattern.
 *
 * DEPLOYMENT
 *   Library module, built with `npm run build`. Output is picked up by Cloud
 *   Logging automatically when deployed.
 */

import { logger as fnLogger } from "firebase-functions/v2";

export interface LogContext {
  correlationId?: string;
  providerId?: string;
  userUid?: string;
  workflow?: string;
  idempotencyKey?: string;
  [k: string]: unknown;
}

export function createLogger(base: LogContext = {}) {
  const ctx = { ...base };
  return {
    child(extra: LogContext) {
      return createLogger({ ...ctx, ...extra });
    },
    debug: (msg: string, data?: object) => fnLogger.debug(msg, { ...ctx, ...data }),
    info: (msg: string, data?: object) => fnLogger.info(msg, { ...ctx, ...data }),
    warn: (msg: string, data?: object) => fnLogger.warn(msg, { ...ctx, ...data }),
    error: (msg: string, data?: object) => fnLogger.error(msg, { ...ctx, ...data }),
  };
}

export type Logger = ReturnType<typeof createLogger>;
