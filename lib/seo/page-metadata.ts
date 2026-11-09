/**
 * Next.js `Metadata` builders for the SEO phase 2 templates in
 * `lib/seo/page-meta.ts` — adds the canonical, Open Graph / Twitter tags with
 * the default 1200×630 image, and the small database reads the templates need
 * (a brand's own categories, a product's same-brand siblings).
 */
import type { Metadata } from "next";
import { getPrisma } from "@/lib/db/prisma";
import { canonicalUrl } from "@/lib/seo/canonical";
import { SITE_NAME, staticPageMeta } from "@/lib/seo/page-meta";

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export type OgImageKind = "category" | "brand" | "page";

/** URL of the generated default OG image (app/og/route.tsx). */
export function ogImagePath(kind: OgImageKind, slug: string): string {
  return `/og?type=${kind}&slug=${encodeURIComponent(slug)}`;
}

/**
 * Open Graph + Twitter tags for one page. A page's `openGraph` replaces the
 * layout's entirely (Next does not merge it), so siteName/locale/type are
 * repeated here.
 */
export function socialMetadata(input: {
  title: string;
  description: string;
  canonical: string;
  image: { url: string; alt: string; width?: number; height?: number };
}): Pick<Metadata, "openGraph" | "twitter"> {
  const image = {
    width: 1200,
    height: 630,
    ...input.image,
  };
  return {
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_BD",
      url: input.canonical,
      title: input.title,
      description: input.description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}

/**
 * Title, description, canonical and social tags for a static page from
 * `STATIC_PAGE_META`. `override` lets an admin-written meta title/description
 * (Admin → Pages) win over the built-in copy.
 */
export function staticPageMetadata(
  path: string,
  override?: { title?: string | null; description?: string | null },
): Metadata {
  const meta = staticPageMeta(path);
  const title = override?.title?.trim() || meta.title;
  const description = override?.description?.trim() || meta.description;
  const canonical = canonicalUrl(path);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    ...socialMetadata({
      title,
      description,
      canonical,
      image: { url: ogImagePath("page", path.slice(1)), alt: title },
    }),
  };
}

/**
 * Catch-all / promotional categories that say nothing about what a brand
 * makes ("For Home User", "Desktop Offer", "All Laptop", …).
 */
const UMBRELLA_CATEGORY =
  /^(?:.*\boffers?\b.*|all\b.*|for\b.*|components?|accessories|gadgets?|daily lifestyle|power|security|appliances?|server & storage|office equipment)$/iu;

/**
 * Names of the categories a brand's active products are filed under, most
 * products first (umbrella/offer categories skipped). Feeds the brand title's
 * "main product type" and the description's product list.
 */
export async function brandTopCategories(
  brandSlug: string,
  limit = 3,
): Promise<string[]> {
  if (!usesDatabase()) {
    return [];
  }
  const prisma = getPrisma();
  const groups = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { isActive: true, brand: { slug: brandSlug } },
    _count: { _all: true },
    orderBy: { _count: { categoryId: "desc" } },
    take: 12,
  });
  if (groups.length === 0) {
    return [];
  }
  const categories = await prisma.category.findMany({
    where: { id: { in: groups.map((group) => group.categoryId) }, isActive: true },
    select: { id: true, name: true },
  });
  const names = new Map(categories.map((category) => [category.id, category.name.trim()]));
  const out: string[] = [];
  for (const group of groups) {
    const name = names.get(group.categoryId);
    if (!name || UMBRELLA_CATEGORY.test(name) || out.includes(name)) {
      continue;
    }
    out.push(name);
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

/** Names of the other active products of the same brand (unique titles). */
export async function productSiblingNames(
  brandSlug: string,
  productSlug: string,
): Promise<string[]> {
  if (!usesDatabase() || !brandSlug) {
    return [];
  }
  const rows = await getPrisma().product.findMany({
    where: { isActive: true, brand: { slug: brandSlug }, NOT: { slug: productSlug } },
    select: { name: true },
    take: 5_000,
  });
  return rows.map((row) => row.name);
}
