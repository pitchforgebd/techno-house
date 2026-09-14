/**
 * At-rest secret encryption suite (F-06).
 *
 *   npm run test:secretcrypto
 *
 * Three modules encrypt operator-supplied credentials — payment gateway,
 * object storage, courier API — and all three derived their AES key from a
 * single unsalted SHA-256 over a passphrase with a 16-character minimum. The
 * AES-256-GCM around it was fine; the derivation was not. SHA-256 is built to
 * be fast, so an attacker holding a database backup could grind a human-chosen
 * passphrase cheaply, and with no salt one precomputation served every
 * installation and all three purposes at once.
 *
 * Pure input/output against the derivation — no database, no request scope.
 */
import { createCipheriv, randomBytes } from "node:crypto";
import {
  deriveSecretKey,
  legacySecretKey,
  PRODUCTION_MIN_LENGTH,
} from "../../lib/security/secret-key";
import {
  encryptGatewaySecrets,
  decryptGatewaySecrets,
} from "../../lib/payments/secret-crypto";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const PASSPHRASE = "a-reasonably-long-operator-passphrase";
const HEX_KEY = "a".repeat(64);
const B64_KEY = Buffer.alloc(32, 7).toString("base64");

function main(): void {
  // --- Derivation is no longer a bare hash --------------------------------
  const derived = deriveSecretKey(PASSPHRASE, "gateway", false);
  check("a passphrase derives a key", derived.ok);
  if (derived.ok) {
    check("the derived key is 32 bytes", derived.key.length === 32);
    const legacy = legacySecretKey(PASSPHRASE);
    check(
      "the derived key is NOT the old unsalted SHA-256",
      legacy !== null && !derived.key.equals(legacy),
      "derivation is unchanged",
    );
  }

  // --- The salt separates purposes ----------------------------------------
  const gateway = deriveSecretKey(PASSPHRASE, "gateway", false);
  const storage = deriveSecretKey(PASSPHRASE, "storage", false);
  const courier = deriveSecretKey(PASSPHRASE, "courier", false);
  check(
    "the same passphrase yields a different key per purpose",
    gateway.ok &&
      storage.ok &&
      courier.ok &&
      !gateway.key.equals(storage.key) &&
      !gateway.key.equals(courier.key) &&
      !storage.key.equals(courier.key),
    "one compromised purpose would expose the others",
  );

  // --- Determinism, or nothing decrypts -----------------------------------
  const again = deriveSecretKey(PASSPHRASE, "gateway", false);
  check(
    "derivation is deterministic",
    gateway.ok && again.ok && gateway.key.equals(again.key),
  );

  // --- Full-entropy keys are used directly --------------------------------
  const hex = deriveSecretKey(HEX_KEY, "gateway", true);
  check("64 hex characters are accepted as a raw key", hex.ok);
  check(
    "a hex key is used verbatim rather than stretched",
    hex.ok && hex.key.equals(Buffer.from(HEX_KEY, "hex")),
  );
  const b64 = deriveSecretKey(B64_KEY, "gateway", true);
  check("32 base64-encoded bytes are accepted as a raw key", b64.ok);

  // --- Production raises the bar ------------------------------------------
  const shortish = "sixteen-chars-ok";
  check(
    `a ${shortish.length}-character passphrase is allowed in development`,
    deriveSecretKey(shortish, "gateway", false).ok,
  );
  const inProd = deriveSecretKey(shortish, "gateway", true);
  check(
    "the same passphrase is REFUSED in production",
    !inProd.ok,
    "production accepted a weak key",
  );
  check(
    "the refusal says how to generate a proper key",
    !inProd.ok && inProd.reason.includes("openssl rand"),
    inProd.ok ? undefined : inProd.reason,
  );
  check(
    `production requires at least ${PRODUCTION_MIN_LENGTH} characters`,
    !deriveSecretKey("x".repeat(PRODUCTION_MIN_LENGTH - 1), "gateway", true).ok &&
      deriveSecretKey("x".repeat(PRODUCTION_MIN_LENGTH), "gateway", true).ok,
  );
  check("an empty key is refused", !deriveSecretKey("", "gateway", false).ok);
  check(
    "an undefined key is refused",
    !deriveSecretKey(undefined, "gateway", false).ok,
  );

  // --- Round trip through the real module ---------------------------------
  const previous = process.env.GATEWAY_SECRETS_KEY;
  process.env.GATEWAY_SECRETS_KEY = PASSPHRASE;
  try {
    const plaintext = JSON.stringify({ storePassword: "s3cret-value" });
    const ciphertext = encryptGatewaySecrets(plaintext);
    check(
      "a secret round-trips through encrypt/decrypt",
      decryptGatewaySecrets(ciphertext) === plaintext,
    );
    check(
      "the ciphertext does not contain the plaintext",
      !ciphertext.includes("s3cret-value"),
    );
    check(
      "two encryptions of the same value differ (random IV)",
      encryptGatewaySecrets(plaintext) !== encryptGatewaySecrets(plaintext),
    );
    check(
      "a tampered ciphertext fails to decrypt rather than returning garbage",
      decryptGatewaySecrets(`${ciphertext.slice(0, -4)}AAAA`) !== plaintext,
    );

    // --- Legacy ciphertext still opens --------------------------------------
    // Simulate a secret written before F-06, using the old SHA-256 key.
    const legacyKey = legacySecretKey(PASSPHRASE);
    check("a legacy key can still be constructed", legacyKey !== null);
    if (legacyKey) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", legacyKey, iv);
      const body = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const legacyCiphertext = Buffer.concat([
        iv,
        cipher.getAuthTag(),
        body,
      ]).toString("base64");

      check(
        "a secret encrypted with the OLD key still decrypts",
        decryptGatewaySecrets(legacyCiphertext) === plaintext,
        "existing stored credentials would have become unreadable",
      );
      check(
        "the legacy ciphertext differs from a modern one",
        legacyCiphertext !== ciphertext,
      );
    }
  } finally {
    if (previous === undefined) {
      delete process.env.GATEWAY_SECRETS_KEY;
    } else {
      process.env.GATEWAY_SECRETS_KEY = previous;
    }
  }

  if (failures > 0) {
    console.error(`secret crypto failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} secret crypto checks`);
}

main();
