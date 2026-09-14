/**
 * AES-256-GCM helpers for CourierSetting secrets (Pathao/Steadfast).
 *
 * Key material: COURIER_SECRETS_KEY (any string ≥ 16 chars; hashed to 32
 * bytes). Scoped separately from GATEWAY_SECRETS_KEY/STORAGE_SECRETS_KEY —
 * unrelated secret domains don't share a key.
 * Ciphertext format: base64(iv[12] + authTag[16] + ciphertext).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  deriveSecretKey,
  legacySecretKey,
} from "@/lib/security/secret-key";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function readKeyMaterial(): Buffer | null {
  const resolved = deriveSecretKey(process.env.COURIER_SECRETS_KEY, "courier");
  return resolved.ok ? resolved.key : null;
}

/** Why the key was rejected, for surfacing to the admin who set it. */
export function courierKeyProblem(): string | null {
  const resolved = deriveSecretKey(process.env.COURIER_SECRETS_KEY, "courier");
  return resolved.ok ? null : resolved.reason;
}

/**
 * Pre-F-06 key. Decryption only — see lib/security/secret-key.ts. Anything it
 * opens is re-encrypted with the modern key the next time it is saved.
 */
function readLegacyKeyMaterial(): Buffer | null {
  return legacySecretKey(process.env.COURIER_SECRETS_KEY);
}

export function courierSecretsKeyConfigured(): boolean {
  return readKeyMaterial() !== null;
}

export function encryptCourierSecrets(plaintextJson: string): string {
  const key = readKeyMaterial();
  if (!key) {
    throw new Error(
      "COURIER_SECRETS_KEY is not set (min 16 characters). Add it to .env.local to store courier secrets.",
    );
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintextJson, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/** Attempts one key. Returns null when the auth tag does not verify. */
function openWith(key: Buffer, ciphertext: string): string | null {
  try {
    const buf = Buffer.from(ciphertext, "base64");
    if (buf.length <= IV_LEN + TAG_LEN) {
      return null;
    }
    const iv = buf.subarray(0, IV_LEN);
    const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = buf.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

export function decryptCourierSecrets(ciphertext: string): string | null {
  const key = readKeyMaterial();
  if (key) {
    const opened = openWith(key, ciphertext);
    if (opened !== null) {
      return opened;
    }
  }

  // Written before F-06 changed the derivation. GCM's auth tag makes this
  // unambiguous — a wrong key fails to verify rather than returning garbage —
  // so trying the legacy key second is safe. It is never used to encrypt, so a
  // secret re-saved after this change is upgraded in place.
  const legacy = readLegacyKeyMaterial();
  if (legacy) {
    return openWith(legacy, ciphertext);
  }
  return null;
}
