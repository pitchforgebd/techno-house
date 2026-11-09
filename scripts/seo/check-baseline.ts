/**
 * SEO baseline (P17-T06).
 *
 *   npm run test:seo
 *
 * Static guards against known regressions. Not a live crawl.
 */
import { existsSync, readFileSync } from "node:fs";
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

  const nextConfig = readFileSync(join(root, "next.config.ts"), "utf8");
  check(
    "next.config.ts forces blocking (non-streamed) metadata for Googlebot " +
      "— Next's own default htmlLimitedBots list only matches suffixed/" +
      "prefixed Google crawler names (AdsBot-Google, Google-InspectionTool, " +
      "...), not plain Googlebot, so without this a <meta name=" +
      '"google-site-verification"> or canonical/JSON-LD tag can be absent ' +
      "from the raw HTML a non-JS crawler reads even though it renders " +
      "correctly after hydration",
    nextConfig.includes("htmlLimitedBots") && nextConfig.includes("Googlebot"),
  );

  const rootLayoutSrc = readFileSync(join(root, "app/layout.tsx"), "utf8");
  check(
    "root layout sets the Google Search Console verification meta tag",
    rootLayoutSrc.includes("verification:") &&
      rootLayoutSrc.includes("google:"),
  );

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

  check(
    "/sitemap.xml is a sitemap index (route handler), not a single urlset",
    !existsSync(join(root, "app/sitemap.ts")) &&
      readFileSync(join(root, "app/sitemap.xml/route.ts"), "utf8").includes(
        "renderSitemapIndex",
      ),
  );
  for (const section of ["pages", "categories", "brands", "products", "blog"]) {
    const file = join(root, `app/sitemap-${section}.xml/route.ts`);
    check(
      `child sitemap /sitemap-${section}.xml exists and renders its own section`,
      existsSync(file) &&
        readFileSync(file, "utf8").includes(`listSitemapSection("${section}")`),
    );
  }
  check(
    "robots.txt does not block /_next/ or /uploads/ (Google needs CSS/JS/images)",
    !robots.includes('"/_next') && !robots.includes('"/uploads'),
  );

  // Real 404s (SEO phase 1). A loading.tsx at the app root (or anywhere above
  // a detail page) is a Suspense boundary that flushes a 200 header before
  // the page's notFound() runs → "200 + noindex" soft 404s.
  check(
    "no app/loading.tsx Suspense boundary above every route",
    !existsSync(join(root, "app/loading.tsx")) &&
      !existsSync(join(root, "app/(storefront)/loading.tsx")),
  );
  for (const dir of ["product", "category", "brand", "offers", "blog"]) {
    check(
      `no loading.tsx above /${dir} pages`,
      !existsSync(join(root, `app/(storefront)/${dir}/loading.tsx`)) &&
        !existsSync(join(root, `app/(storefront)/${dir}/[slug]/loading.tsx`)),
    );
  }
  for (const file of [
    "app/(storefront)/product/[slug]/page.tsx",
    "app/(storefront)/category/[slug]/page.tsx",
    "app/(storefront)/brand/[slug]/page.tsx",
  ]) {
    const source = readFileSync(join(root, file), "utf8");
    const metadataFn = source.slice(
      source.indexOf("export async function generateMetadata"),
      source.indexOf("export default"),
    );
    check(
      `${file} generateMetadata calls notFound() for a missing record`,
      metadataFn.includes("notFound()"),
    );
  }

  const middlewareSrc = readFileSync(join(root, "middleware.ts"), "utf8");
  check(
    "middleware 301s www / plain-http requests to the canonical origin",
    middlewareSrc.includes("canonicalHostRedirect") &&
      middlewareSrc.includes('type: "host"') &&
      middlewareSrc.includes("x-forwarded-proto"),
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
      /alternates: \{\s*canonical\b/.test(source) &&
        /(listingCanonicalUrl|canonicalUrl)\(/.test(source),
    );
  }

  // staticPageMetadata() is the one place static pages get their canonical.
  const pageMetadataSrc = readFileSync(
    join(root, "lib/seo/page-metadata.ts"),
    "utf8",
  );
  check(
    "staticPageMetadata sets a self-canonical from the page path",
    pageMetadataSrc.includes("const canonical = canonicalUrl(path);") &&
      pageMetadataSrc.includes("alternates: { canonical }"),
  );
  const setsCanonical = (source: string) =>
    /alternates: \{\s*canonical\b/.test(source) ||
    source.includes("staticPageMetadata(");

  for (const page of [
    "about", "contact", "faq", "support", "warranty", "shipping", "returns",
    "terms", "privacy", "digital-commerce-guideline",
  ]) {
    check(
      `/${page} uses storefrontContentMetadata (which sets its self-canonical)`,
      readFileSync(
        join(root, `app/(storefront)/${page}/page.tsx`),
        "utf8",
      ).includes(`storefrontContentMetadata(`),
    );
  }
  check(
    "storefrontContentMetadata sets a self-canonical on every content page",
    readFileSync(
      join(root, "features/content/storefront-content-page.tsx"),
      "utf8",
    ).includes("staticPageMetadata(`/${slug}`"),
  );
  for (const page of [
    "brands", "deals", "offers", "offers/[slug]", "flash-sale", "pc-builder",
    "blog", "complaint", "product-request", "track",
  ]) {
    const source = readFileSync(
      join(root, `app/(storefront)/${page}/page.tsx`),
      "utf8",
    );
    check(`/${page} sets a self-canonical`, setsCanonical(source));
  }

  // SEO phase 2 guards.
  check(
    "category descriptions no longer claim prices are display-only",
    !/display-only|not a charge|nothing is charged/i.test(
      readFileSync(join(root, "lib/catalog/category-page-content.ts"), "utf8"),
    ),
  );
  const listingBar = readFileSync(
    join(root, "features/catalog/category-listing-bar.tsx"),
    "utf8",
  );
  check(
    "category H1 holds only the title — the product count is outside it",
    /<h1[^>]*>\s*\{title\}\s*<\/h1>/.test(listingBar) &&
      listingBar.includes("Products\"} found"),
  );
  check(
    "cart drawer / mobile menu title is not a heading",
    !readFileSync(join(root, "components/ui/sheet.tsx"), "utf8").includes(
      "<h2",
    ),
  );
  check(
    "footer column titles are not headings",
    !readFileSync(
      join(root, "components/layout/site-footer.tsx"),
      "utf8",
    ).includes("<h2"),
  );
  const marquee = readFileSync(
    join(root, "components/layout/marquee-notice-bar.tsx"),
    "utf8",
  );
  check(
    "marquee notice is a role=note and renders its headings as non-headings",
    marquee.includes('role="note"') && marquee.includes("demoteHeadings("),
  );
  check(
    "default OG image route exists and resolves text server-side only",
    existsSync(join(root, "app/og/route.tsx")) &&
      readFileSync(join(root, "app/og/route.tsx"), "utf8").includes(
        "headingFor(",
      ),
  );

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

  // SEO phase 3: no rating/review markup at all (the page shows stars even
  // with 0 reviews), never price 0, offer = what the buy box displays.
  const jsonLdSrc = readFileSync(join(root, "lib/seo/json-ld.ts"), "utf8");
  const jsonLdCode = jsonLdSrc.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  check(
    "JSON-LD builders emit no aggregateRating / review",
    !/aggregateRating|"review"|\breview:/.test(jsonLdCode),
  );
  check(
    "Product offers only for a publishable, visible price",
    jsonLdCode.includes("!offer.priceHidden && isPublishablePrice(offer.price)"),
  );
  check(
    "no shippingDetails / hasMerchantReturnPolicy while those pages are placeholders",
    !/shippingDetails|hasMerchantReturnPolicy/.test(jsonLdCode),
  );
  check(
    "product page builds the offer from displayedOffer()",
    productPage.includes("offer: displayedOffer(product, linkedVariant"),
  );
  // The site's "9:00–22:00" is support hours, not confirmed shop hours.
  check(
    "ElectronicsStore has no opening hours (shop hours not confirmed)",
    !/openingHours|parseDailyHours/.test(jsonLdCode),
  );
  const geoBlock = jsonLdCode.match(
    /STORE_GEO = \{[\s\S]*?latitude:\s*([\d.]+),[\s\S]*?longitude:\s*([\d.]+)/,
  );
  const lat = Number(geoBlock?.[1]);
  const lng = Number(geoBlock?.[2]);
  check(
    "ElectronicsStore geo: GeoCoordinates, numeric, latitude 23–24, longitude 90–91",
    jsonLdCode.includes('"GeoCoordinates"') &&
      jsonLdCode.includes("geo: STORE_GEO") &&
      lat >= 23 && lat <= 24 && lng >= 90 && lng <= 91,
  );
  check(
    "ElectronicsStore on home and contact",
    readFileSync(join(root, "app/(storefront)/page.tsx"), "utf8").includes("<StoreJsonLd") &&
      readFileSync(join(root, "app/(storefront)/contact/page.tsx"), "utf8").includes("<StoreJsonLd"),
  );
  check(
    "category listing emits an ItemList of the products on the page",
    readFileSync(join(root, "features/catalog/category-listing.tsx"), "utf8").includes("itemListJsonLd(result.items"),
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

  // SEO phase 4 — performance guards.
  const read = (file: string) => readFileSync(join(root, file), "utf8");
  check(
    "mega-menu: the page renders department triggers only; panels load from /api/nav-menu",
    read("components/layout/category-nav.tsx").includes("loadNavTriggers()") &&
      !read("components/layout/category-nav.tsx").includes("buildMegaMenuPanels") &&
      read("components/layout/category-mega-nav.tsx").includes("useNavMenu()") &&
      existsSync(join(root, "app/api/nav-menu/route.ts")),
  );
  check(
    "mobile drawer gets top-level categories only (children load on open)",
    read("components/layout/site-header.tsx").includes("<MobileNav roots={roots} />") &&
      !read("components/layout/site-header.tsx").includes("brandsByCategory={"),
  );
  check(
    "subcategories stay linked from their parent category page",
    read("features/catalog/category-listing.tsx").includes('aria-label="Subcategories"'),
  );
  const heroSlider = read("features/home/home-hero-slider.tsx");
  check(
    "hero: first slide priority, other slides' images only mounted when needed",
    heroSlider.includes("priority={slideIndex === 0}") &&
      heroSlider.includes("mounted.has(slideIndex)"),
  );
  const css = read("app/globals.css");
  const marqueeKeyframes = css.slice(
    css.indexOf("@keyframes th-marquee"),
    css.indexOf("}", css.indexOf("to {", css.indexOf("@keyframes th-marquee")) + 1),
  );
  check(
    "marquee animates transform only (animating `left` is layout shift)",
    marqueeKeyframes.includes("transform") && !/\bleft\s*:/.test(marqueeKeyframes),
  );
  const nextConfigSrc = read("next.config.ts");
  check(
    "image optimizer kept cheap: WebP only, short size lists, long cache",
    nextConfigSrc.includes('formats: ["image/webp"]') &&
      nextConfigSrc.includes("minimumCacheTTL") &&
      nextConfigSrc.includes("deviceSizes"),
  );
  check(
    "uploads bypass the optimizer (served by nginx from disk)",
    read("lib/image-loader.ts").includes('src.startsWith("/uploads/")'),
  );
  const optimizeUploads = read("scripts/optimize-uploads.mjs");
  check(
    "optimize-uploads is a dry run unless --apply, and never writes over an original",
    optimizeUploads.includes('process.argv.includes("--apply")') &&
      read("lib/media/webp-variant.mjs").includes("${base}.webp") &&
      read("lib/media/webp-variant.mjs").includes("${base}.min.webp") &&
      !/unlink\(filePath\)|writeFile\(filePath/.test(read("lib/media/webp-variant.mjs")),
  );
  check(
    "optimize-svg writes .min.svg next to the original, dry run by default",
    read("scripts/optimize-svg.mjs").includes('.replace(/\\.svg$/i, ".min.svg")') &&
      read("scripts/optimize-svg.mjs").includes('process.argv.includes("--apply")'),
  );
  check(
    "admin upload handler writes a WebP variant and removes it with the original",
    read("lib/media/admin-media.ts").includes("await writeWebpVariant(abs)") &&
      read("lib/media/admin-media.ts").includes("await removeVariantOf(abs)"),
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
