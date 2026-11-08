/**
 * Meta match-key normalisation shared by the browser tracker and the server
 * Conversions API sender (AD-389). Pure — no Node or DOM APIs — so both sides
 * normalise identically and a test script can exercise it directly.
 */

/**
 * Bangladeshi mobile number in the international form Meta matches on:
 * `8801XXXXXXXXX` (13 digits). Accepts `01XXXXXXXXX`, `+8801…`, `8801…`,
 * `1XXXXXXXXX` and anything with spaces/dashes. Returns null when the digits
 * cannot be a BD mobile number — a wrong value hashed is worse than none.
 */
export function normalizeBdPhone(
  raw: string | null | undefined,
): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("880") && digits.length === 13) {
    national = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 11) {
    national = digits.slice(1);
  } else if (digits.length === 10) {
    national = digits;
  } else {
    return null;
  }
  // BD mobiles are 1[3-9]XXXXXXXX after the leading 0 is dropped.
  if (!/^1[3-9]\d{8}$/.test(national)) {
    return null;
  }
  return `880${national}`;
}

/** Trimmed, lower-cased email, or null when it is not email-shaped. */
export function normalizeEmailForMatch(
  raw: string | null | undefined,
): string | null {
  const value = (raw ?? "").trim().toLowerCase();
  return value.includes("@") && value.length <= 254 ? value : null;
}

/** First word of a full name, lower-cased (Meta `fn`). */
export function normalizeFirstName(
  raw: string | null | undefined,
): string | null {
  const first = (raw ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return first && first !== "customer" ? first.slice(0, 64) : null;
}

/**
 * `_fbp` / `_fbc` cookie format: `fb.<subdomainIndex>.<creationTimeMs>.<value>`.
 * Anything else is dropped rather than forwarded to Meta or stored on an order.
 */
const FB_COOKIE_PATTERN = /^fb\.\d\.\d{10,16}\.[A-Za-z0-9_\-.]{1,400}$/;

export function sanitizeFbCookie(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim();
  return value.length <= 500 && FB_COOKIE_PATTERN.test(value) ? value : null;
}

/** Same shape check, for an `fbclid` query value before it becomes `_fbc`. */
export function sanitizeFbclid(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim();
  return /^[A-Za-z0-9_\-.]{1,400}$/.test(value) ? value : null;
}
