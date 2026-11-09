import { publicOrigin } from "@/lib/seo/public-origin";

/**
 * Where a request on a non-canonical origin should be sent (SEO phase 1).
 *
 * The canonical origin is `APP_URL` (live: https://technohouse.com.bd — no
 * www, https). Two cases redirect:
 *
 *   - the host is `www.` + the canonical host (any scheme), and
 *   - the host is the canonical host but the proxy reports plain http while
 *     the canonical origin is https.
 *
 * Anything else — localhost, an IP, a health check on another host, a dev
 * setup whose APP_URL is http — returns null and is left alone, so this can
 * never redirect away from a host it does not own.
 */
export function canonicalHostRedirect(input: {
  host: string | null;
  forwardedProto: string | null;
  pathAndQuery: string;
  origin?: string;
}): string | null {
  const host = input.host?.trim().toLowerCase();
  if (!host) {
    return null;
  }
  let canonical: URL;
  try {
    canonical = new URL(input.origin ?? publicOrigin());
  } catch {
    return null;
  }
  const canonicalHost = canonical.host.toLowerCase();
  const target = `${canonical.origin}${input.pathAndQuery}`;

  if (host === `www.${canonicalHost}`) {
    return target;
  }
  const proto = input.forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (
    host === canonicalHost &&
    canonical.protocol === "https:" &&
    proto === "http"
  ) {
    return target;
  }
  return null;
}
