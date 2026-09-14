/**
 * Opaque session token helpers shared by customer and staff auth.
 * Cookie names and tables stay separate (docs/SECURITY.md).
 */
import { createHash, randomBytes } from "node:crypto";
import { SESSION_TOKEN_BYTES } from "@/lib/auth/session-token-format";

export {
  SESSION_TOKEN_BYTES,
  SESSION_TOKEN_LENGTH,
  isWellFormedSessionToken,
} from "@/lib/auth/session-token-format";

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Optional IP fingerprint — never store the raw address. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) {
    return null;
  }
  const trimmed = ip.trim();
  if (!trimmed) {
    return null;
  }
  return createHash("sha256").update(trimmed).digest("hex");
}
