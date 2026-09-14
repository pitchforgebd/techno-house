/**
 * Public catalog XML feeds (P15-T07).
 *
 * Google Merchant Center: `/feeds/google.xml` when MERCHANT_CENTER is on.
 * Facebook catalog: `/feeds/facebook.xml` when META_PIXEL is on.
 * Display fields only. `DATA_SOURCE=mock` keeps both feeds off.
 */
import {
  getAdminMerchantConfig,
  getAdminMetaConfig,
} from "@/lib/analytics/config";
import { getPrisma } from "@/lib/db/prisma";

const FEED_LIMIT = 200;

export const GOOGLE_FEED_PATH = "/feeds/google.xml";
export const FACEBOOK_FEED_PATH = "/feeds/facebook.xml";

export type FeedProduct = {
  sku: string;
  name: string;
  slug: string;
  priceAmount: number;
  currency: string;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  brandName: string;
  categoryName: string;
  imageSrc: string | null;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function publicOrigin(): string {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  return "http://127.0.0.1:3000";
}

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${publicOrigin()}${path}`;
}

function availability(
  status: FeedProduct["stockStatus"],
): "in_stock" | "out_of_stock" {
  return status === "OUT_OF_STOCK" ? "out_of_stock" : "in_stock";
}

function priceLabel(product: FeedProduct): string {
  return `${product.priceAmount.toFixed(2)} ${product.currency}`;
}

/**
 * Real products currently eligible for both public catalog feeds — same
 * query both `/feeds/google.xml` and `/feeds/facebook.xml` use, exported
 * so the admin "Facebook Catalog Products" page can show exactly what's
 * actually live, not an approximation.
 */
export async function listFeedProducts(): Promise<FeedProduct[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().product.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    take: FEED_LIMIT,
    select: {
      sku: true,
      name: true,
      slug: true,
      priceAmount: true,
      currency: true,
      stockStatus: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: { src: true },
      },
    },
  });

  return rows.map((row) => ({
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    priceAmount: row.priceAmount,
    currency: row.currency,
    stockStatus: row.stockStatus,
    brandName: row.brand.name,
    categoryName: row.category.name,
    imageSrc: row.images[0]?.src ?? null,
  }));
}

function itemXml(product: FeedProduct): string {
  const link = absoluteUrl(`/product/${product.slug}`);
  const image = product.imageSrc ? absoluteUrl(product.imageSrc) : "";
  return `    <item>
      <g:id>${xmlEscape(product.sku)}</g:id>
      <title>${xmlEscape(product.name)}</title>
      <link>${xmlEscape(link)}</link>
      <description>${xmlEscape(product.name)}</description>
      <g:brand>${xmlEscape(product.brandName)}</g:brand>
      <g:product_type>${xmlEscape(product.categoryName)}</g:product_type>
      <g:condition>new</g:condition>
      <g:availability>${availability(product.stockStatus)}</g:availability>
      <g:price>${xmlEscape(priceLabel(product))}</g:price>
      ${image ? `<g:image_link>${xmlEscape(image)}</g:image_link>` : ""}
    </item>`;
}

function rssDocument(title: string, items: FeedProduct[]): string {
  const origin = publicOrigin();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(title)}</title>
    <link>${xmlEscape(origin)}</link>
    <description>${xmlEscape(title)}</description>
${items.map(itemXml).join("\n")}
  </channel>
</rss>
`;
}

export async function renderGoogleMerchantFeed(): Promise<string | null> {
  if (!usesDatabase()) {
    return null;
  }
  const config = await getAdminMerchantConfig();
  if (!config.isEnabled) {
    return null;
  }
  const products = await listFeedProducts();
  return rssDocument("Techno House Google product feed", products);
}

export async function renderFacebookCatalogFeed(): Promise<string | null> {
  if (!usesDatabase()) {
    return null;
  }
  const config = await getAdminMetaConfig();
  if (!config.isEnabled) {
    return null;
  }
  const products = await listFeedProducts();
  return rssDocument("Techno House Facebook catalog feed", products);
}
