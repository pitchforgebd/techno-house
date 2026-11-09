/**
 * Public sitemap (P15-T08; split into a sitemap index in SEO phase 1).
 *
 *   /sitemap.xml             sitemap index → the five files below
 *   /sitemap-pages.xml       home, listings, marketing/legal pages
 *   /sitemap-categories.xml  active categories
 *   /sitemap-brands.xml      active brands
 *   /sitemap-products.xml    active products
 *   /sitemap-blog.xml        published blog posts
 *
 * Only URLs that answer 200 and are indexable are listed: the filters here
 * are the same ones the pages use to decide between the page and a 404
 * (`isActive: true` for product/category/brand, `PUBLISHED` for posts).
 * Account, admin, checkout, cart, search and other private/noindex tools stay
 * out. `lastmod` is the row's real `updatedAt` (posts: `publishedAt`), never
 * the request time. `DATA_SOURCE=mock` returns the static pages only.
 */
import { getPrisma } from "@/lib/db/prisma";
import { CONTENT_PAGE_SLUGS } from "@/lib/content/pages";
import { publicOrigin } from "@/lib/seo/public-origin";
import { ROBOTS_PATH, SITEMAP_PATH } from "@/lib/seo/fields";

export { ROBOTS_PATH, SITEMAP_PATH };

export type SitemapEntry = {
  path: string;
  /** Real `updatedAt`/`publishedAt` from the row this path came from — not
   * set for static paths that have no such column. */
  lastModified?: Date;
};

export const SITEMAP_SECTIONS = [
  "pages",
  "categories",
  "brands",
  "products",
  "blog",
] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

// Google's ceiling is 50,000 URLs / 50MB per sitemap file. These caps are
// headroom under that per-file limit, not an editorial choice. If the product
// count ever nears PRODUCT_LIMIT, split sitemap-products.xml into numbered
// files instead of raising it past 50,000.
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
  "/digital-commerce-guideline",
] as const;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export function absoluteSitemapUrl(path: string): string {
  return `${publicOrigin()}${path}`;
}

export function sitemapSectionPath(section: SitemapSection): string {
  return `/sitemap-${section}.xml`;
}

const CONTENT_SLUGS = new Set<string>(CONTENT_PAGE_SLUGS);

async function listPageEntries(): Promise<SitemapEntry[]> {
  if (!usesDatabase()) {
    return STATIC_SITEMAP_PATHS.map((path) => ({ path }));
  }
  // Content pages (about, warranty, …) are DB rows with a real updatedAt.
  const rows = await getPrisma().contentPage.findMany({
    where: { slug: { in: [...CONTENT_PAGE_SLUGS] } },
    select: { slug: true, updatedAt: true },
  });
  const updated = new Map(rows.map((row) => [row.slug, row.updatedAt]));
  return STATIC_SITEMAP_PATHS.map((path) => {
    const slug = path.slice(1);
    return CONTENT_SLUGS.has(slug)
      ? { path, lastModified: updated.get(slug) }
      : { path };
  });
}

export async function listSitemapSection(
  section: SitemapSection,
): Promise<SitemapEntry[]> {
  if (section === "pages") {
    return listPageEntries();
  }
  if (!usesDatabase()) {
    return [];
  }
  const prisma = getPrisma();
  switch (section) {
    case "categories": {
      const rows = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        take: TAXONOMY_LIMIT,
        select: { slug: true, updatedAt: true },
      });
      return rows.map((row) => ({
        path: `/category/${row.slug}`,
        lastModified: row.updatedAt,
      }));
    }
    case "brands": {
      const rows = await prisma.brand.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        take: TAXONOMY_LIMIT,
        select: { slug: true, updatedAt: true },
      });
      return rows.map((row) => ({
        path: `/brand/${row.slug}`,
        lastModified: row.updatedAt,
      }));
    }
    case "products": {
      const rows = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { position: "asc" },
        take: PRODUCT_LIMIT,
        select: { slug: true, updatedAt: true },
      });
      return rows.map((row) => ({
        path: `/product/${row.slug}`,
        lastModified: row.updatedAt,
      }));
    }
    case "blog": {
      const rows = await prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: POST_LIMIT,
        select: { slug: true, updatedAt: true, publishedAt: true },
      });
      return rows.map((row) => ({
        path: `/blog/${row.slug}`,
        lastModified: row.publishedAt ?? row.updatedAt,
      }));
    }
  }
}

/** Every URL across all sections, de-duplicated (admin summary, smoke test). */
export async function listSitemapEntries(): Promise<SitemapEntry[]> {
  const sections = await Promise.all(SITEMAP_SECTIONS.map(listSitemapSection));
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  for (const entry of sections.flat()) {
    if (seen.has(entry.path)) {
      continue;
    }
    seen.add(entry.path);
    entries.push(entry);
  }
  return entries;
}

/** @deprecated Use `listSitemapEntries` — kept for the e2e smoke test's path-only check. */
export async function listSitemapPaths(): Promise<string[]> {
  return (await listSitemapEntries()).map((entry) => entry.path);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function latest(entries: SitemapEntry[]): Date | undefined {
  let max: Date | undefined;
  for (const entry of entries) {
    if (entry.lastModified && (!max || entry.lastModified > max)) {
      max = entry.lastModified;
    }
  }
  return max;
}

/** `<urlset>` document for one section. */
export function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const lastmod = entry.lastModified
      ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
      : "";
    return `<url><loc>${escapeXml(absoluteSitemapUrl(entry.path))}</loc>${lastmod}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/** `<sitemapindex>` listing every section, each with its newest lastmod. */
export async function renderSitemapIndex(): Promise<string> {
  const sections = await Promise.all(
    SITEMAP_SECTIONS.map(async (section) => ({
      section,
      lastModified: latest(await listSitemapSection(section)),
    })),
  );
  const items = sections.map(({ section, lastModified }) => {
    const lastmod = lastModified
      ? `<lastmod>${lastModified.toISOString()}</lastmod>`
      : "";
    return `<sitemap><loc>${escapeXml(absoluteSitemapUrl(sitemapSectionPath(section)))}</loc>${lastmod}</sitemap>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items,
    "</sitemapindex>",
    "",
  ].join("\n");
}

export function sitemapXmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
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
