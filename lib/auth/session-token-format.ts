/**
 * Session token shape — safe for middleware (no Node crypto).
 * Tokens are 32-byte base64url values (43 characters, no padding).
 */
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const SESSION_TOKEN_BYTES = 32;
export const SESSION_TOKEN_LENGTH = 43;

export function isWellFormedSessionToken(token: string): boolean {
  return SESSION_TOKEN_PATTERN.test(token);
}
