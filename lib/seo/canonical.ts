import { publicOrigin } from "@/lib/seo/public-origin";

/**
 * Absolute canonical URL for a storefront path. Always the clean path with
 * no query string — filter/sort/page combinations on a listing should never
 * be indexed as separate pages from their base listing, so every page that
 * accepts those params points its canonical back at the bare path.
 */
export function canonicalUrl(path: string): string {
  return `${publicOrigin()}${path}`;
}
