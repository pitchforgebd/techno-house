/**
 * Anonymous per-browser visitor id (AD-258). A random cookie value, never an
 * IP address or account id — used only to count distinct real viewers for
 * the "N people are viewing this" PDP widget. Cookie writes only happen
 * inside Server Actions (not Server Component render), per Next.js rules.
 */
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { opaqueSessionCookieFlags } from "@/lib/auth/session-cookie";

const VISITOR_COOKIE = "th_vid";
const VISITOR_TTL_MS = 1000 * 60 * 60 * 24 * 365;

export async function getOrCreateVisitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value?.trim();
  if (existing) {
    return existing;
  }
  const id = randomUUID();
  jar.set(VISITOR_COOKIE, id, {
    ...opaqueSessionCookieFlags("/"),
    expires: new Date(Date.now() + VISITOR_TTL_MS),
  });
  return id;
}
