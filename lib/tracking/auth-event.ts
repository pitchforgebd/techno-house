/**
 * One-shot flag cookie for sign-ups / logins that finish on the server
 * (social OAuth callback → redirect), so the next page load can fire
 * CompleteRegistration / Login in the browser (AD-389). Not httpOnly on
 * purpose: it carries no secret, only "sign_up.google"-style text, and the
 * browser deletes it as soon as it is read.
 */
export const AUTH_EVENT_COOKIE = "th_auth_evt";
export const AUTH_EVENT_MAX_AGE_SECONDS = 300;

export type AuthEventKind = "sign_up" | "login";

export function encodeAuthEvent(kind: AuthEventKind, method: string): string {
  return `${kind}.${method.toLowerCase().replace(/[^a-z0-9_]/g, "")}`;
}

export function parseAuthEvent(
  raw: string | null | undefined,
): { kind: AuthEventKind; method: string } | null {
  const match = /^(sign_up|login)\.([a-z0-9_]{1,32})$/.exec(raw ?? "");
  if (!match) {
    return null;
  }
  return { kind: match[1] as AuthEventKind, method: match[2] as string };
}
