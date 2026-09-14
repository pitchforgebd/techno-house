/**
 * Password hashing (P11-T01).
 *
 * Argon2id with OWASP/Lucia-recommended parameters. Never log passwords or
 * hashes. Marked as a server external in next.config.ts so the native binding
 * is not bundled into the client graph.
 */
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

/** Dummy hash so missing-user login still spends Argon2 time. */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

/** Hash a plaintext password for storage. */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Constant-time verify against a stored Argon2id hash. */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}
