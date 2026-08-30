/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative and external URLs.
 */
export function safeReturnPath(
  value: string | null | undefined,
  fallback = "/account",
): string {
  if (!value) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  if (trimmed.includes("://")) {
    return fallback;
  }
  return trimmed;
}

export function loginHref(returnTo: string): string {
  const next = safeReturnPath(returnTo, "/checkout");
  return `/account/login?next=${encodeURIComponent(next)}`;
}

export function registerHref(returnTo: string): string {
  const next = safeReturnPath(returnTo, "/checkout");
  return `/account/register?next=${encodeURIComponent(next)}`;
}
