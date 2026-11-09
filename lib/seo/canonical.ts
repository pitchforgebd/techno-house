import { publicOrigin } from "@/lib/seo/public-origin";

/**
 * Absolute canonical URL for a storefront path, with no query string. Use it
 * for pages that are one URL; listings that paginate use
 * `listingCanonicalUrl` below.
 */
export function canonicalUrl(path: string): string {
  return `${publicOrigin()}${path}`;
}

type SearchParamsLike = Record<string, string | string[] | undefined>;

const TRACKING_PARAMS = new Set(["fbclid", "gclid", "gbraid", "wbraid", "msclkid"]);

function isTrackingParam(key: string): boolean {
  return key.startsWith("utm_") || TRACKING_PARAMS.has(key);
}

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Canonical for a paginated listing (category, brand, shop, deals, offer).
 *
 *   - `?page=N` (N > 1) and no other parameter → `path?page=N`, so page 2+
 *     is indexable and the products on it are discoverable.
 *   - any other parameter present (filters, sort, pageSize, q, …) → the clean
 *     `path`: filter/sort combinations are never indexed as separate pages.
 *   - page 1 / no page → the clean `path`.
 *
 * Empty parameters (`?sort=`) and ad/analytics click parameters (utm_*,
 * fbclid, gclid, …) do not count as present.
 */
export function listingCanonicalUrl(
  path: string,
  searchParams: SearchParamsLike | undefined,
): string {
  const clean = canonicalUrl(path);
  if (!searchParams) {
    return clean;
  }
  let page = 1;
  for (const [key, raw] of Object.entries(searchParams)) {
    const value = firstValue(raw)?.trim();
    if (!value || isTrackingParam(key)) {
      continue;
    }
    if (key !== "page") {
      return clean;
    }
    if (!/^\d+$/.test(value)) {
      return clean;
    }
    page = Number.parseInt(value, 10);
  }
  return page > 1 ? `${clean}?page=${page}` : clean;
}
