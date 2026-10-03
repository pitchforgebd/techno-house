/**
 * SEO baseline (P17-T06).
 *
 *   npm run test:seo
 *
 * Static guards against known regressions. Not a live crawl.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function main(): void {
  const root = process.cwd();

  const robots = readFileSync(join(root, "app/robots.ts"), "utf8");
  check(
    "robots disallows admin/account/dev/checkout",
    robots.includes('"/admin/"') &&
      robots.includes('"/account/"') &&
      robots.includes('"/dev/"') &&
      robots.includes('"/checkout/"'),
  );
  check(
    "robots disallows cart/wishlist/compare/search",
    robots.includes('"/cart"') &&
      robots.includes('"/wishlist"') &&
      robots.includes('"/compare"') &&
      robots.includes('"/search"'),
  );
  check(
    "robots disallows b2b (defense-in-depth alongside its page-level noindex)",
    robots.includes('"/b2b/"'),
  );
  check(
    "robots points at sitemap via publicOrigin",
    robots.includes("sitemap:") && robots.includes("publicOrigin()"),
  );

  const sitemapApp = readFileSync(join(root, "app/sitemap.ts"), "utf8");
  check(
    "app/sitemap.ts builds absolute URLs with lastModified",
    sitemapApp.includes("listSitemapEntries") &&
      sitemapApp.includes("absoluteSitemapUrl") &&
      sitemapApp.includes("lastModified"),
  );

  const sitemapLib = readFileSync(join(root, "lib/seo/sitemap.ts"), "utf8");
  check(
    "sitemap includes products/categories/brands/posts with caps",
    sitemapLib.includes("PRODUCT_LIMIT") &&
      sitemapLib.includes("/product/") &&
      sitemapLib.includes("/category/") &&
      sitemapLib.includes("/brand/") &&
      sitemapLib.includes("/blog/"),
  );
  check(
    "sitemap static paths exclude cart and account",
    sitemapLib.includes("STATIC_SITEMAP_PATHS") &&
      !sitemapLib.includes('"/cart"') &&
      !sitemapLib.includes('"/account"'),
  );
  check(
    "sitemap caps are well above realistic catalog size, not the old 500/200/100",
    sitemapLib.includes("PRODUCT_LIMIT = 20_000") &&
      sitemapLib.includes("TAXONOMY_LIMIT = 5_000") &&
      sitemapLib.includes("POST_LIMIT = 5_000"),
  );

  const rootLayout = readFileSync(join(root, "app/layout.tsx"), "utf8");
  check(
    "root layout sets metadataBase from publicOrigin",
    rootLayout.includes("metadataBase") &&
      rootLayout.includes("publicOrigin()"),
  );

  const storefrontLayout = readFileSync(
    join(root, "app/(storefront)/layout.tsx"),
    "utf8",
  );
  check(
    "storefront layout sets openGraph defaults",
    storefrontLayout.includes("openGraph:") &&
      storefrontLayout.includes("getStorefrontSeoMetadata"),
  );

  const productPage = readFileSync(
    join(root, "app/(storefront)/product/[slug]/page.tsx"),
    "utf8",
  );
  check(
    "product pages set description + openGraph",
    productPage.includes("description") &&
      productPage.includes("openGraph:") &&
      productPage.includes("overview"),
  );
  check(
    "product pages set canonical and emit Product + BreadcrumbList JSON-LD with real breadcrumb UI",
    productPage.includes("alternates: { canonical:") &&
      productPage.includes("productJsonLd") &&
      productPage.includes("breadcrumbListJsonLd") &&
      productPage.includes("<Breadcrumbs"),
  );

  for (const [label, file] of [
    ["homepage", "app/(storefront)/page.tsx"],
    ["shop", "app/(storefront)/shop/page.tsx"],
    ["category", "app/(storefront)/category/[slug]/page.tsx"],
    ["brand", "app/(storefront)/brand/[slug]/page.tsx"],
  ] as const) {
    const source = readFileSync(join(root, file), "utf8");
    check(
      `${label} page sets a canonical (filter/sort/page-stable)`,
      source.includes("alternates: { canonical:") &&
        source.includes("canonicalUrl("),
    );
  }

  check(
    "category + brand listings emit BreadcrumbList JSON-LD matching the visible trail",
    readFileSync(
      join(root, "features/catalog/category-listing.tsx"),
      "utf8",
    ).includes("breadcrumbListJsonLd") &&
      readFileSync(
        join(root, "features/catalog/brand-listing.tsx"),
        "utf8",
      ).includes("breadcrumbListJsonLd"),
  );

  check(
    "storefront layout mounts sitewide Organization + WebSite JSON-LD",
    storefrontLayout.includes("<SiteJsonLd"),
  );

  check(
    "Product JSON-LD only emits aggregateRating from real review data",
    readFileSync(join(root, "lib/seo/json-ld.ts"), "utf8").includes(
      "reviewCount > 0 && averageRating != null",
    ),
  );

  const cartPage = readFileSync(
    join(root, "app/(storefront)/cart/page.tsx"),
    "utf8",
  );
  check(
    "cart is noindex",
    cartPage.includes("NO_INDEX") || cartPage.includes("index: false"),
  );

  const searchPage = readFileSync(
    join(root, "app/(storefront)/search/page.tsx"),
    "utf8",
  );
  check(
    "search is noindex",
    searchPage.includes("NO_INDEX") || searchPage.includes("index: false"),
  );

  const adminLayout = readFileSync(join(root, "app/(admin)/layout.tsx"), "utf8");
  check(
    "admin layout is noindex",
    adminLayout.includes("index: false"),
  );

  check(
    "privacy page is on the same CMS pattern as the other legal pages",
    readFileSync(join(root, "lib/content/pages.ts"), "utf8").includes(
      '"privacy"',
    ) &&
      readFileSync(
        join(root, "app/(storefront)/privacy/page.tsx"),
        "utf8",
      ).includes("StorefrontContentPage"),
  );

  console.log(
    failures === 0
      ? `ok ${checks} seo checks`
      : `failed ${failures}/${checks} seo checks`,
  );
  if (failures > 0) {
    process.exit(1);
  }
}

main();
