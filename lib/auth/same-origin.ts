/**
 * Same-origin check for auth mutations (P11-T03).
 *
 * Next.js Server Actions already reject cross-site posts; this is defense
 * in depth so login/logout/profile never run from a foreign Origin.
 */
import { headers } from "next/headers";

export function originMatchesHost(origin: string, hostHeader: string): boolean {
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = hostHeader.split(",")[0]?.trim() ?? "";
  return host.length > 0 && originHost === host;
}

export async function isSameOriginRequest(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) {
    return false;
  }

  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return originMatchesHost(origin, host);
}

export const CROSS_ORIGIN_ERROR = "This request could not be verified.";
