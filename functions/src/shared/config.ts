/**
 * PURPOSE
 *   Resolve environment + provider configuration for the backend at runtime.
 *
 * EXPLANATION
 *   Document D §9: three isolated projects (dev/staging/prod). The active
 *   project id comes from the runtime (GCLOUD_PROJECT). Provider-level config
 *   (tax, channels, loyalty rates — many marked [PRD-TBD]) lives in the
 *   providers/{id} document and is read per request, never hardcoded. Sprint 1
 *   exposes the resolver shape only.
 *
 * DEPLOYMENT
 *   No secrets in code. Secret Manager values are bound at deploy time
 *   (Document D §10). Built with `npm run build`.
 */

export type AppEnv = "development" | "staging" | "production";

export function activeProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    "jhigucocina-dev"
  );
}

export function appEnv(): AppEnv {
  const p = activeProjectId();
  if (p === "jhigucocina") return "production";
  if (p === "jhigucocina-staging") return "staging";
  return "development";
}

export const DEFAULT_PROVIDER_ID = "jhigucocina";

export function isEmulator(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}

/** Default region for all functions (Document D platform stance; [PRD-TBD]). */
export const FUNCTIONS_REGION = "us-central1";
