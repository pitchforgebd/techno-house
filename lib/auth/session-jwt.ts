/**
 * Session JWT envelope — hybrid auth (P19-T01).
 *
 * The cookie holds a signed JWT wrapping the existing opaque session token
 * (see `session-token.ts`), not the raw token directly. This is additive,
 * not a replacement for the DB-backed session model:
 * - The JWT signature + `exp` let `middleware.ts` (Edge runtime, no DB
 *   access) reject a tampered, forged, or expired cookie immediately,
 *   instead of only checking that it *looks* like a token (43 base64url
 *   chars) and deferring everything else to the server.
 * - Revocation, permission freshness, and audit fields (`revokedAt`,
 *   `lastUsedAt`, staff/customer status) stay exactly as before: looked up
 *   fresh from `StaffSession`/`CustomerSession` on every request via the
 *   unwrapped token's hash. A valid, unexpired JWT proves nothing on its
 *   own about whether the session was since revoked — only the DB does.
 *
 * Deliberately does not put staffId/permissions/anything else in the JWT
 * payload: caching authorization data in the token would let a revoked
 * permission or role change stay in effect until the JWT expires. The only
 * thing worth being fast/stateless about here is "is this cookie
 * authentic and not expired," which is exactly what the DB row's own
 * `expiresAt` already tracks — this just lets Edge middleware check it too.
 *
 * Uses `jose` (not `jsonwebtoken`) because it works on both the Node
 * runtime (Server Components/Actions) and the Edge runtime (middleware)
 * via Web Crypto — no Node `crypto` module dependency.
 */
import { jwtVerify, SignJWT } from "jose";

const ALG = "HS256";
const MIN_SECRET_LENGTH = 32;

let cachedKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  if (cachedKey) {
    return cachedKey;
  }
  const secret = process.env.SESSION_JWT_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_JWT_SECRET is not set (or shorter than ${MIN_SECRET_LENGTH} characters). ` +
        "Copy .env.example to .env.local and set it — see docs/DATABASE.md.",
    );
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

/** Signs the opaque session token into a JWT whose `exp` matches the DB row. */
export async function signSessionJwt(input: {
  token: string;
  expiresAt: Date;
}): Promise<string> {
  return new SignJWT({ tok: input.token })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(input.expiresAt)
    .sign(getSecretKey());
}

/**
 * Verifies signature + expiry and returns the wrapped opaque token, or
 * `null` for any failure (missing, malformed, expired, bad signature) —
 * callers treat that identically to "no session cookie."
 */
export async function verifySessionJwt(jwt: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(jwt, getSecretKey(), {
      algorithms: [ALG],
    });
    return typeof payload.tok === "string" ? payload.tok : null;
  } catch {
    return null;
  }
}
