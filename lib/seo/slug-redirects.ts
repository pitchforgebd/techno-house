import redirects from "@/lib/seo/slug-redirects.json";

/**
 * Old product slug -> current slug, for slugs changed by
 * scripts/fix-catalog-text.mjs (SEO phase 5). A file, not a table: no
 * migration, and the redirects ship with the code that needs them.
 *
 * Only consulted once a slug is NOT in the database, so an entry can never
 * shadow a live product. Follows a chain (a -> b -> c) to its end; a loop
 * resolves to null and the visitor gets the normal 404.
 */
const MAX_HOPS = 10;

export function resolveSlugRedirect(
  slug: string,
  map: Readonly<Record<string, string>> = redirects as Record<string, string>,
): string | null {
  let current = slug;
  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const next = Object.hasOwn(map, current) ? map[current] : undefined;
    if (!next) {
      return current === slug ? null : current;
    }
    if (next === slug) {
      return null;
    }
    current = next;
  }
  return null;
}
