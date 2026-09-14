/**
 * Staff session cookie constants (safe for middleware).
 * Distinct from `th_customer_session` — never share an "isLoggedIn" meaning.
 */
export const STAFF_SESSION_COOKIE = "th_staff_session";

/** Cookie path isolates staff sessions from the storefront. */
export const STAFF_SESSION_COOKIE_PATH = "/admin";

/** Absolute session lifetime from creation. */
export const STAFF_SESSION_TTL_MS = 1000 * 60 * 60 * 12;
