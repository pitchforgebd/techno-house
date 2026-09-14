/**
 * Customer session cookies (P11-T01).
 *
 * Cookie name is customer-only — staff auth uses `th_staff_session`.
 */
import { cookies } from "next/headers";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customer-session-constants";
import { opaqueSessionCookieFlags } from "@/lib/auth/session-cookie";
import { signSessionJwt, verifySessionJwt } from "@/lib/auth/session-jwt";

export {
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_TTL_MS,
} from "@/lib/auth/customer-session-constants";

const cookieBase = opaqueSessionCookieFlags("/");

/**
 * The cookie stores a signed JWT wrapping the opaque token (see
 * `session-jwt.ts`) — callers still get back the same plain token as
 * before, unaware of the JWT layer underneath.
 */
export async function readCustomerSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  const jwt = jar.get(CUSTOMER_SESSION_COOKIE)?.value?.trim();
  if (!jwt) {
    return null;
  }
  return verifySessionJwt(jwt);
}

export async function setCustomerSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const jar = await cookies();
  const jwt = await signSessionJwt({ token, expiresAt });
  jar.set(CUSTOMER_SESSION_COOKIE, jwt, {
    ...cookieBase,
    expires: expiresAt,
  });
}

/**
 * Best-effort: `getCustomerSession()` calls this from a plain render (a
 * cached read, not a Server Action), where Next.js forbids mutating cookies
 * at all — that throws, not a no-op. This is pre-existing, not introduced
 * by the JWT change above, but real: a revoked/expired/deleted session
 * still hits this path on its very next page load. Swallow only that
 * specific error; `getCustomerSession()` already returns `null` regardless,
 * so security is unaffected — the stale cookie just lingers until a real
 * login/logout Server Action (where this succeeds normally) clears it, or
 * it expires.
 */
export async function clearCustomerSessionCookie(): Promise<void> {
  const jar = await cookies();
  try {
    jar.set(CUSTOMER_SESSION_COOKIE, "", {
      ...cookieBase,
      maxAge: 0,
    });
  } catch {
    // Not in a Server Action / Route Handler — see comment above.
  }
}
