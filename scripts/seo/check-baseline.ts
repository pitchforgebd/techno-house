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
    "robots points at sitemap via publicOrigin",
    robots.includes("sitemap:") && robots.includes("publicOrigin()"),
  );

  const sitemapApp = readFileSync(join(root, "app/sitemap.ts"), "utf8");
  check(
    "app/sitemap.ts builds absolute URLs",
    sitemapApp.includes("listSitemapPaths") &&
      sitemapApp.includes("absoluteSitemapUrl"),
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
