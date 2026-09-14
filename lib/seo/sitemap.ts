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

const PRODUCT_LIMIT = 500;
const TAXONOMY_LIMIT = 200;
const POST_LIMIT = 100;

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

export async function listSitemapPaths(): Promise<string[]> {
  const paths = new Set<string>(STATIC_SITEMAP_PATHS);
  if (!usesDatabase()) {
    return [...paths];
  }

  const [categories, brands, products, posts] = await Promise.all([
    getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: TAXONOMY_LIMIT,
      select: { slug: true },
    }),
    getPrisma().brand.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: TAXONOMY_LIMIT,
      select: { slug: true },
    }),
    getPrisma().product.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      take: PRODUCT_LIMIT,
      select: { slug: true },
    }),
    getPrisma().blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: POST_LIMIT,
      select: { slug: true },
    }),
  ]);

  for (const row of categories) {
    paths.add(`/category/${row.slug}`);
  }
  for (const row of brands) {
    paths.add(`/brand/${row.slug}`);
  }
  for (const row of products) {
    paths.add(`/product/${row.slug}`);
  }
  for (const row of posts) {
    paths.add(`/blog/${row.slug}`);
  }
  return [...paths];
}

export async function getSitemapAdminSummary(): Promise<{
  urlCount: number;
  updatedAt: string | null;
}> {
  if (!usesDatabase()) {
    return { urlCount: STATIC_SITEMAP_PATHS.length, updatedAt: null };
  }
  const [paths, seo] = await Promise.all([
    listSitemapPaths(),
    getPrisma().sEOConfiguration.findFirst({
      where: { path: null },
      select: { updatedAt: true },
    }),
  ]);
  return {
    urlCount: paths.length,
    updatedAt: seo?.updatedAt.toISOString() ?? null,
  };
}
