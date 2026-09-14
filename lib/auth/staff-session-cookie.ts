/**
 * Staff session cookies (P11-T02).
 *
 * Path is `/admin` so this cookie is not sent on storefront requests.
 */
import { cookies } from "next/headers";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_COOKIE_PATH,
} from "@/lib/auth/staff-session-constants";
import { opaqueSessionCookieFlags } from "@/lib/auth/session-cookie";
import { signSessionJwt, verifySessionJwt } from "@/lib/auth/session-jwt";

export {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_COOKIE_PATH,
  STAFF_SESSION_TTL_MS,
} from "@/lib/auth/staff-session-constants";

const cookieBase = opaqueSessionCookieFlags(STAFF_SESSION_COOKIE_PATH);

/**
 * The cookie stores a signed JWT wrapping the opaque token (see
 * `session-jwt.ts`) — callers still get back the same plain token as
 * before, unaware of the JWT layer underneath.
 */
export async function readStaffSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  const jwt = jar.get(STAFF_SESSION_COOKIE)?.value?.trim();
  if (!jwt) {
    return null;
  }
  return verifySessionJwt(jwt);
}

export async function setStaffSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const jar = await cookies();
  const jwt = await signSessionJwt({ token, expiresAt });
  jar.set(STAFF_SESSION_COOKIE, jwt, {
    ...cookieBase,
    expires: expiresAt,
  });
}

/**
 * Best-effort: `getStaffSession()` calls this from a plain render (a cached
 * read, not a Server Action), where Next.js forbids mutating cookies at all
 * — that throws, not a no-op. This is pre-existing, not introduced by the
 * JWT change above, but real: a revoked/expired/deleted session still hits
 * this path on its very next page load. Swallow only that specific error;
 * `getStaffSession()` already returns `null` regardless, so security is
 * unaffected — the stale cookie just lingers until a real login/logout
 * Server Action (where this succeeds normally) clears it, or it expires.
 */
export async function clearStaffSessionCookie(): Promise<void> {
  const jar = await cookies();
  try {
    jar.set(STAFF_SESSION_COOKIE, "", {
      ...cookieBase,
      maxAge: 0,
    });
  } catch {
    // Not in a Server Action / Route Handler — see comment above.
  }
}
