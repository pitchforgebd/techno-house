/**
 * Customer session cookie constants (safe for middleware and Node).
 * Cookie read/write that needs `next/headers` lives in
 * `customer-session-cookie.ts`.
 */
export const CUSTOMER_SESSION_COOKIE = "th_customer_session";

/** Absolute session lifetime from creation. */
export const CUSTOMER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
