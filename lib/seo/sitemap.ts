/**
 * Public sitemap URL list (P15-T08).
 *
 * Static marketing/legal pages plus active categories, brands, products,
 * and published blog posts. Account, admin, checkout, and private tools
 * stay out. `DATA_SOURCE=mock` returns static paths only.
 */
import { getPrisma } from "@/lib/db/prisma";
import { publicOrigin } from "@/lib/seo/public-origin";
import { ROBOTS_PATH, SITEMAP_PATH } from "@/lib/seo/fields";

export { ROBOTS_PATH, SITEMAP_PATH };

export type SitemapEntry = {
  path: string;
  /** Real `updatedAt`/`publishedAt` from the row this path came from — not
   * set for the static marketing/legal paths, which have no such column. */
  lastModified?: Date;
};

// Google's documented ceiling is 50,000 URLs (and 50MB) per sitemap file —
// these are generous headroom under that single-file limit, not an
// editorial choice about how much of the catalog to expose. The previous
// caps (500/200/100) were well below real catalog size and were silently
// dropping entries; a sitemap INDEX split (multiple numbered sitemap files)
// only becomes necessary if the catalog approaches the 50,000 ceiling
// itself, which is not close for this store.
const PRODUCT_LIMIT = 20_000;
const TAXONOMY_LIMIT = 5_000;
const POST_LIMIT = 5_000;

export const STATIC_SITEMAP_PATHS = [
  "/",
  "/shop",
  "/brands",
  "/offers",
  "/flash-sale",
  "/deals",
  "/blog",
  "/pc-builder",
  "/about",
  "/contact",
  "/faq",
  "/support",
  "/warranty",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
] as const;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export function absoluteSitemapUrl(path: string): string {
  return `${publicOrigin()}${path}`;
}

export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  const seen = new Set<string>(STATIC_SITEMAP_PATHS);
  const entries: SitemapEntry[] = STATIC_SITEMAP_PATHS.map((path) => ({
    path,
  }));
  if (!usesDatabase()) {
    return entries;
  }

  const [categories, brands, products, posts] = await Promise.all([
    getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: TAXONOMY_LIMIT,
      select: { slug: true, updatedAt: true },
    }),
    getPrisma().brand.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: TAXONOMY_LIMIT,
      select: { slug: true, updatedAt: true },
    }),
    getPrisma().product.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: PRODUCT_LIMIT,
      select: { slug: true, updatedAt: true },
    }),
    getPrisma().blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: POST_LIMIT,
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
  ]);

  function add(path: string, lastModified?: Date) {
    if (seen.has(path)) {
      return;
    }
    seen.add(path);
    entries.push({ path, lastModified });
  }

  for (const row of categories) {
    add(`/category/${row.slug}`, row.updatedAt);
  }
  for (const row of brands) {
    add(`/brand/${row.slug}`, row.updatedAt);
  }
  for (const row of products) {
    add(`/product/${row.slug}`, row.updatedAt);
  }
  for (const row of posts) {
    add(`/blog/${row.slug}`, row.publishedAt ?? row.updatedAt);
  }
  return entries;
}

/** @deprecated Use `listSitemapEntries` — kept for the e2e smoke test's path-only check. */
export async function listSitemapPaths(): Promise<string[]> {
  return (await listSitemapEntries()).map((entry) => entry.path);
}

export async function getSitemapAdminSummary(): Promise<{
  urlCount: number;
  updatedAt: string | null;
}> {
  if (!usesDatabase()) {
    return { urlCount: STATIC_SITEMAP_PATHS.length, updatedAt: null };
  }
  const [entries, seo] = await Promise.all([
    listSitemapEntries(),
    getPrisma().sEOConfiguration.findFirst({
      where: { path: null },
      select: { updatedAt: true },
    }),
  ]);
  return {
    urlCount: entries.length,
    updatedAt: seo?.updatedAt.toISOString() ?? null,
  };
}
