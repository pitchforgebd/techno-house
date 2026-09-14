/**
 * Guest cart cookies (P13-T01).
 *
 * Cookie holds the raw opaque token. `Cart.sessionToken` stores the SHA-256
 * hash only. Path `/` so storefront PDP/cart requests send it. Separate from
 * `th_customer_session` / `th_staff_session`.
 */
import { cookies } from "next/headers";
import { GUEST_CART_COOKIE } from "@/lib/cart/guest-cart-constants";
import { opaqueSessionCookieFlags } from "@/lib/auth/session-cookie";

export {
  GUEST_CART_COOKIE,
  GUEST_CART_TTL_MS,
} from "@/lib/cart/guest-cart-constants";

const cookieBase = opaqueSessionCookieFlags("/");

export async function readGuestCartCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(GUEST_CART_COOKIE)?.value?.trim();
  return value || null;
}

export async function setGuestCartCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const jar = await cookies();
  jar.set(GUEST_CART_COOKIE, token, {
    ...cookieBase,
    expires: expiresAt,
  });
}

export async function clearGuestCartCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(GUEST_CART_COOKIE, "", {
    ...cookieBase,
    maxAge: 0,
  });
}
