/**
 * Client IP resolution suite (F-04).
 *
 *   npm run test:clientip
 *
 * This value keys every rate-limit bucket and every `ipHash` in a session or
 * audit row. The old code read the LEFT-most `X-Forwarded-For` entry, which is
 * the one part of that header a client fully controls — so rotating it minted
 * a fresh bucket per request and defeated every IP limit in the app.
 *
 * The scenario each case is built around: an attacker sends a forged header,
 * the proxy appends the address it actually saw, and the resolver must return
 * the proxy's entry rather than the attacker's.
 *
 * Pure input/output — no database, no request scope, no server needed.
 */
import {
  DEFAULT_TRUSTED_PROXY_HOPS,
  resolveClientIp,
  trustedProxyHops,
} from "../../lib/auth/client-ip";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Builds a header lookup from a plain object. */
function headers(map: Record<string, string>) {
  return (name: string) => map[name.toLowerCase()] ?? null;
}

const ATTACKER = "1.2.3.4";
const REAL = "203.0.113.77";

function main(): void {
  // --- The attack this exists to stop -------------------------------------
  // Attacker sends "X-Forwarded-For: 1.2.3.4"; the proxy appends the address
  // it actually received from. Reading from the left returns the forgery.
  const forged = headers({ "x-forwarded-for": `${ATTACKER}, ${REAL}` });
  check(
    "a forged X-Forwarded-For does not override the proxy's entry",
    resolveClientIp(forged, 1) === REAL,
    `got ${resolveClientIp(forged, 1)}`,
  );
  check(
    "the attacker-supplied value is never returned",
    resolveClientIp(forged, 1) !== ATTACKER,
  );

  // Rotating the forged prefix must not change the resolved address, which is
  // what made every IP rate limit bypassable.
  const rotated = [
    `9.9.9.9, ${REAL}`,
    `8.8.8.8, ${REAL}`,
    `7.7.7.7, ${REAL}`,
  ].map((value) => resolveClientIp(headers({ "x-forwarded-for": value }), 1));
  check(
    "rotating the forged prefix yields one stable address (rate limits hold)",
    new Set(rotated).size === 1 && rotated[0] === REAL,
    `got ${JSON.stringify(rotated)}`,
  );

  // --- Hop counts ----------------------------------------------------------
  const twoHops = headers({
    "x-forwarded-for": `${ATTACKER}, ${REAL}, 10.0.0.1`,
  });
  check(
    "two trusted proxies read two entries in from the right",
    resolveClientIp(twoHops, 2) === REAL,
    `got ${resolveClientIp(twoHops, 2)}`,
  );
  check(
    "a single hop against a two-proxy chain returns the nearest proxy, never the client's forgery",
    resolveClientIp(twoHops, 1) === "10.0.0.1",
  );
  check(
    "a hop count longer than the chain clamps to the left-most entry",
    resolveClientIp(forged, 9) === ATTACKER,
    "reading past the start of the chain",
  );

  // --- Direct exposure -----------------------------------------------------
  check(
    "with zero trusted proxies X-Forwarded-For is ignored entirely",
    resolveClientIp(forged, 0) === null,
    `got ${resolveClientIp(forged, 0)}`,
  );
  check(
    "with zero trusted proxies X-Real-IP is ignored too",
    resolveClientIp(headers({ "x-real-ip": ATTACKER }), 0) === null,
  );

  // --- Platform headers win ------------------------------------------------
  for (const name of [
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "true-client-ip",
  ]) {
    check(
      `${name} beats a forged X-Forwarded-For`,
      resolveClientIp(
        headers({ [name]: REAL, "x-forwarded-for": ATTACKER }),
        1,
      ) === REAL,
    );
    check(
      `${name} is trusted even with zero configured hops`,
      resolveClientIp(headers({ [name]: REAL }), 0) === REAL,
    );
  }

  // --- Ordinary traffic ----------------------------------------------------
  check(
    "a normal single-proxy request resolves the client",
    resolveClientIp(headers({ "x-forwarded-for": REAL }), 1) === REAL,
  );
  check(
    "X-Real-IP is used when no forwarding chain is present",
    resolveClientIp(headers({ "x-real-ip": REAL }), 1) === REAL,
  );
  check(
    "no headers at all resolves to null rather than a fabricated value",
    resolveClientIp(headers({}), 1) === null,
  );
  check(
    "whitespace and empty entries are tolerated",
    resolveClientIp(headers({ "x-forwarded-for": `  , ${REAL} , ` }), 1) === REAL,
    `got ${resolveClientIp(headers({ "x-forwarded-for": `  , ${REAL} , ` }), 1)}`,
  );

  // --- Configuration parsing ----------------------------------------------
  check("hops defaults to 1 when unset", trustedProxyHops(undefined) === DEFAULT_TRUSTED_PROXY_HOPS);
  check("hops defaults when the value is not a number", trustedProxyHops("abc") === DEFAULT_TRUSTED_PROXY_HOPS);
  check("hops defaults when the value is negative", trustedProxyHops("-3") === DEFAULT_TRUSTED_PROXY_HOPS);
  check("hops of 0 is respected (direct exposure)", trustedProxyHops("0") === 0);
  check("an explicit hop count is respected", trustedProxyHops("3") === 3);

  if (failures > 0) {
    console.error(`client ip failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} client ip checks`);
}

main();
