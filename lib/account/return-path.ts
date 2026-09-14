/**
 * Allow only same-origin relative paths for post-login redirects.
 * Rejects protocol-relative and external URLs.
 */
export { safeReturnPath, safeAdminReturnPath } from "@/lib/auth/return-path";

import { safeReturnPath } from "@/lib/auth/return-path";

export function loginHref(returnTo: string): string {
  const next = safeReturnPath(returnTo, "/checkout");
  return `/account/login?next=${encodeURIComponent(next)}`;
}

export function registerHref(returnTo: string): string {
  const next = safeReturnPath(returnTo, "/checkout");
  return `/account/register?next=${encodeURIComponent(next)}`;
}
