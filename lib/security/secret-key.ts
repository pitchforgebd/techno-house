/**
 * Key derivation for at-rest secret encryption (F-06).
 *
 * Three modules encrypt operator-supplied credentials — payment gateway,
 * object storage, courier API — and all three derived their AES key the same
 * way:
 *
 *     createHash("sha256").update(passphrase).digest()   // 16-char minimum
 *
 * The AES-256-GCM around it is fine. The derivation is the weak part: a single
 * unsalted SHA-256 over a human-chosen string. SHA-256 is built to be fast, so
 * an attacker holding the ciphertext (a database backup, a leak, an insider)
 * can grind a 16-character passphrase very cheaply, and the absence of a salt
 * means one precomputation serves every installation and all three purposes at
 * once. What that protects is live merchant credentials.
 *
 * This replaces it with:
 *
 *   - A **full-entropy key used directly** when the operator supplies one.
 *     32 random bytes as hex or base64 needs no stretching at all, and that is
 *     what production should use.
 *   - **scrypt** otherwise, with a per-purpose salt. Roughly five orders of
 *     magnitude slower per guess than SHA-256, and the salt stops one
 *     precomputation from serving every purpose and every installation.
 *
 * Decryption still accepts the legacy SHA-256 key, so anything already
 * encrypted keeps opening. Encryption always uses the new derivation, so a
 * secret re-saved after this change is upgraded in place.
 */
import { createHash, scryptSync } from "node:crypto";

/** Bytes an AES-256 key needs. */
const KEY_BYTES = 32;

/** Minimum passphrase length accepted outside production. */
const DEV_MIN_LENGTH = 16;

/** Minimum passphrase length accepted in production. */
export const PRODUCTION_MIN_LENGTH = 32;

/** scrypt cost. 2^14 is the usual interactive default and is ample here: this
 *  runs when an admin saves a credential, not on a request path. */
const SCRYPT_COST = { N: 16384, r: 8, p: 1 } as const;

export type SecretPurpose = "gateway" | "storage" | "courier";

/** Per-purpose salt. Keeps one purpose's key from being reusable for another. */
function saltFor(purpose: SecretPurpose): Buffer {
  return Buffer.from(`techno-house:${purpose}:v2`, "utf-8");
}

/**
 * Decodes a passphrase that is already a full-entropy key.
 *
 * Accepts 64 hex characters or base64 that decodes to at least 32 bytes.
 * Returns null when the value is an ordinary passphrase, which is stretched
 * instead.
 */
function decodeFullEntropyKey(raw: string): Buffer | null {
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (/^[A-Za-z0-9+/=_-]{43,}$/.test(raw)) {
    try {
      const decoded = Buffer.from(raw, "base64");
      if (decoded.length >= KEY_BYTES) {
        return decoded.subarray(0, KEY_BYTES);
      }
    } catch {
      // Not base64 — fall through to stretching.
    }
  }
  return null;
}

export type KeyResolution =
  | { ok: true; key: Buffer }
  | { ok: false; reason: string };

/**
 * Derives the encryption key for a purpose.
 *
 * `isProduction` is a parameter rather than read from the environment so this
 * stays testable without mutating `process.env`.
 */
export function deriveSecretKey(
  raw: string | undefined,
  purpose: SecretPurpose,
  isProduction: boolean = process.env.NODE_ENV === "production",
): KeyResolution {
  const value = raw?.trim();
  if (!value) {
    return { ok: false, reason: "No key is configured." };
  }

  const minimum = isProduction ? PRODUCTION_MIN_LENGTH : DEV_MIN_LENGTH;
  const fullEntropy = decodeFullEntropyKey(value);

  // A full-entropy key is accepted on its own terms — its 64 hex / 43+ base64
  // characters already exceed any sensible minimum.
  if (fullEntropy) {
    return { ok: true, key: fullEntropy };
  }

  if (value.length < minimum) {
    return {
      ok: false,
      reason: isProduction
        ? `The key must be at least ${PRODUCTION_MIN_LENGTH} characters, or 32 random bytes as hex/base64. Generate one with: openssl rand -base64 48`
        : `The key must be at least ${DEV_MIN_LENGTH} characters.`,
    };
  }

  return {
    ok: true,
    key: scryptSync(value, saltFor(purpose), KEY_BYTES, {
      N: SCRYPT_COST.N,
      r: SCRYPT_COST.r,
      p: SCRYPT_COST.p,
    }),
  };
}

/**
 * The pre-F-06 key, for reading secrets encrypted before this change.
 *
 * Used ONLY as a decryption fallback — never to encrypt. Anything it opens is
 * re-encrypted with the modern key the next time it is saved.
 */
export function legacySecretKey(raw: string | undefined): Buffer | null {
  const value = raw?.trim();
  if (!value || value.length < DEV_MIN_LENGTH) {
    return null;
  }
  return createHash("sha256").update(value).digest();
}
