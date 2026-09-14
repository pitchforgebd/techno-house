/**
 * Same-origin relative path helpers for post-login redirects (P17-T01).
 *
 * Rejects protocol-relative and absolute URLs. Admin paths must stay under
 * `/admin` (except the staff login gate itself).
 */

function isAdminLoginRoute(path: string): boolean {
  return path === "/admin/login" || path.startsWith("/admin/access/");
}

/**
 * Any path only ever resolved against this, never used or returned.
 * `.invalid` is reserved by RFC 2606 and can never be a real host.
 */
const RESOLUTION_BASE = "https://return-path.invalid";

export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/account",
): string {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();

  // Validated by resolving, not by blocklist (F-03).
  //
  // The previous version rejected a leading `//` and any `://`, which looks
  // thorough and is not. Browsers parse URLs by the WHATWG rules, where a
  // BACKSLASH is equivalent to a forward slash for http(s) — so `/\evil.com`
  // survived every check above and then resolved to `https://evil.com/`. It
  // starts with `/`, it does not start with `//`, and it contains no `://`.
  //
  // That is the trouble with enumerating bad shapes: this one needed no
  // exotic encoding, and the next parser quirk would need another rule. So
  // resolve the candidate against a base that cannot exist and require that
  // the origin survived. Anything that escapes the origin — protocol-relative,
  // absolute, backslash-smuggled, or whatever comes next — fails the same way.
  let resolved: URL;
  try {
    resolved = new URL(trimmed, RESOLUTION_BASE);
  } catch {
    return fallback;
  }
  if (resolved.origin !== RESOLUTION_BASE) {
    return fallback;
  }

  // Belt and braces, kept from the original guard. `/account/https://evil.com`
  // resolves same-origin and so passes the check above — it is a genuinely
  // safe path, just a bizarre one. No route in this app contains `://`, so
  // refusing it costs nothing and keeps an obviously-suspicious redirect
  // target out of the logs.
  if (trimmed.includes("://")) {
    return fallback;
  }

  // Rebuilt from the parsed URL rather than returned as typed, so the value
  // handed to `redirect()` is the one that was actually validated.
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

export function safeAdminReturnPath(
  value: string | null | undefined,
  fallback = "/admin",
): string {
  const candidate = safeReturnPath(value, fallback);
  if (!candidate.startsWith("/admin") || isAdminLoginRoute(candidate)) {
    return fallback;
  }
  return candidate;
}
