/**
 * RSA helpers for the Nagad Payment Gateway (PGW) protocol.
 *
 * Nagad's own reference implementations (PHP `openssl_public_encrypt` /
 * `openssl_private_encrypt` / `openssl_sign`) use PKCS#1 v1.5 padding, so
 * this mirrors that with Node's built-in `crypto` — no extra dependency.
 * Nagad encrypts its own responses with ITS private key, so the merchant
 * side decrypts with Nagad's PUBLIC key (`publicDecrypt`), the reverse of
 * the usual RSA direction — this is the standard "sign-as-encrypt" pattern
 * that OpenSSL exposes and Nagad's guides rely on.
 */
import { constants, createSign, publicDecrypt, publicEncrypt, randomBytes } from "node:crypto";

function normalizePem(raw: string): string {
  return raw.trim().replace(/\\n/g, "\n");
}

/** Merchant → Nagad request payload, encrypted with Nagad's PG public key. */
export function encryptForNagad(plaintext: string, nagadPublicKeyPem: string): string {
  return publicEncrypt(
    { key: normalizePem(nagadPublicKeyPem), padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(plaintext, "utf8"),
  ).toString("base64");
}

/** Signs the same plaintext with the merchant's private key. */
export function signForNagad(plaintext: string, merchantPrivateKeyPem: string): string {
  return createSign("RSA-SHA256")
    .update(plaintext, "utf8")
    .sign(normalizePem(merchantPrivateKeyPem), "base64");
}

/** Nagad → merchant response payload, decrypted with Nagad's PG public key. */
export function decryptFromNagad(
  base64Ciphertext: string,
  nagadPublicKeyPem: string,
): string | null {
  try {
    return publicDecrypt(
      { key: normalizePem(nagadPublicKeyPem), padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(base64Ciphertext, "base64"),
    ).toString("utf8");
  } catch {
    return null;
  }
}

export function nagadChallenge(): string {
  return randomBytes(20).toString("hex");
}

export function nagadDateTime(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}
