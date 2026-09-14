/**
 * CSRF state for the OAuth2 redirect round-trip (Phase 9). The state value
 * is generated on `/api/auth/social/<provider>` and stored in a short-lived
 * httpOnly cookie; the callback route rejects the request unless the
 * provider's `state` query param matches the cookie exactly — a classic
 * double-submit check that stops an attacker from forging a callback.
 */
import { randomBytes } from "node:crypto";

export const OAUTH_STATE_COOKIE = "th_oauth_state";
export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export type OAuthStateCookiePayload = {
  state: string;
  next: string;
  provider: string;
};

export function createOAuthState(): string {
  return randomBytes(24).toString("base64url");
}

export function encodeOAuthStateCookie(payload: OAuthStateCookiePayload): string {
  return JSON.stringify(payload);
}

export function decodeOAuthStateCookie(
  raw: string | undefined,
): OAuthStateCookiePayload | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<OAuthStateCookiePayload>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.next !== "string" ||
      typeof parsed.provider !== "string"
    ) {
      return null;
    }
    return {
      state: parsed.state,
      next: parsed.next,
      provider: parsed.provider,
    };
  } catch {
    return null;
  }
}
