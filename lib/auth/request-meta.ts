/**
 * Request metadata for session and audit rows. IP is hashed before storage.
 *
 * The client address itself is resolved in `lib/auth/client-ip.ts` — see there
 * for why the right-most `X-Forwarded-For` entry is the trustworthy one and
 * how `TRUSTED_PROXY_HOPS` controls it (F-04).
 */
import { headers } from "next/headers";
import { resolveClientIp } from "@/lib/auth/client-ip";

export async function getRequestMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  return {
    ip: resolveClientIp((name) => h.get(name)),
    userAgent: h.get("user-agent"),
  };
}
