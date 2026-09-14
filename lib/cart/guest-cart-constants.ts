/**
 * Guest cart cookie constants (safe for middleware and Node).
 * Cookie read/write that needs `next/headers` lives in
 * `guest-cart-cookie.ts`.
 */
export const GUEST_CART_COOKIE = "th_guest_cart";

/** Absolute guest-cart cookie lifetime from last write. */
export const GUEST_CART_TTL_MS = 1000 * 60 * 60 * 24 * 30;
