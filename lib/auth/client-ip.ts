/**
 * Client IP resolution (F-04).
 *
 * This value keys every rate-limit bucket and every `ipHash` written to a
 * session or audit row, so getting it wrong has two consequences: an attacker
 * can mint a fresh bucket per request, and the audit trail records whatever
 * they typed.
 *
 * The old code took the LEFT-most `X-Forwarded-For` entry. That is exactly
 * backwards. A reverse proxy *appends* the address it received from, so a
 * request carrying a forged header arrives as:
 *
 *     X-Forwarded-For: 1.2.3.4, <real client address>
 *                      ^ attacker-supplied   ^ written by the proxy
 *
 * The left-most entry is the one piece of that header the client fully
 * controls; the right-most is the only part the proxy vouches for. Reading
 * from the right — by however many proxies actually sit in front — is what
 * makes the value trustworthy.
 *
 * How many to skip is deployment topology, not something code can infer, so it
 * comes from `TRUSTED_PROXY_HOPS`:
 *
 *   1  (default) one reverse proxy — nginx, Caddy, a load balancer, Vercel
 *   2+          that many proxies in front of the app
 *   0           the app is directly exposed, so `X-Forwarded-For` is nothing
 *               but attacker input and is ignored entirely
 */

/** Headers written by the edge itself, which a client cannot forge through it. */
const PLATFORM_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "true-client-ip",
] as const;

export const DEFAULT_TRUSTED_PROXY_HOPS = 1;

export function trustedProxyHops(
  raw: string | undefined = process.env.TRUSTED_PROXY_HOPS,
): number {
  const value = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isInteger(value) || value < 0) {
    return DEFAULT_TRUSTED_PROXY_HOPS;
  }
  return value;
}

function firstEntry(value: string): string | null {
  const entry = value.split(",")[0]?.trim();
  return entry || null;
}

/**
 * Resolves the caller's address from request headers.
 *
 * `get` is a plain lookup so this stays testable without a request scope.
 */
export function resolveClientIp(
  get: (name: string) => string | null | undefined,
  hops: number = trustedProxyHops(),
): string | null {
  // A platform header beats everything: the edge overwrites it, so the client
  // cannot influence it regardless of what they send.
  for (const name of PLATFORM_HEADERS) {
    const value = get(name);
    if (value) {
      const entry = firstEntry(value);
      if (entry) {
        return entry;
      }
    }
  }

  if (hops > 0) {
    const forwarded = get("x-forwarded-for");
    if (forwarded) {
      const entries = forwarded
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (entries.length > 0) {
        // Count back from the right by the number of proxies we trust. Clamped
        // at 0 so a shorter chain than configured yields the left-most entry
        // rather than undefined — conservative, and it cannot read past the
        // start of the array.
        const index = Math.max(0, entries.length - hops);
        return entries[index] ?? null;
      }
    }
  }

  // nginx's `X-Real-IP` is written from the direct peer, so it is as
  // trustworthy as the proxy in front. Ignored when nothing is trusted.
  if (hops > 0) {
    const real = get("x-real-ip")?.trim();
    if (real) {
      return real;
    }
  }

  return null;
}
