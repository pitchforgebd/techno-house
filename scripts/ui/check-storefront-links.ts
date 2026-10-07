/**
 * Links an operator types into the Design Studio must lead somewhere (AD-368).
 *
 *   npm run test:storefront-links
 *
 * Three home banners were saved with links like "/DHFH". The save only checked
 * that the link started with "/", so every visitor's browser logged a 404 for each
 * of them and a click led to the not-found page. `lib/design/storefront-link.ts`
 * now says what a real storefront path is. This suite checks:
 *   - the rule itself, with good links and the junk that was actually saved;
 *   - that its two page lists match the page folders under `app/(storefront)`, so a
 *     new page cannot be added without the rule knowing about it;
 *   - that the banner save uses the rule, and that every component showing an
 *     operator-typed banner link opts out of prefetching it.
 * No database, no network.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { parseFooterWidgetsConfig } from "../../lib/content/footer-settings";
import {
  STOREFRONT_DYNAMIC_PREFIXES,
  STOREFRONT_STATIC_PATHS,
  canonicalStorefrontPath,
  checkStorefrontLink,
  normalizeStorefrontHref,
} from "../../lib/design/storefront-link";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function source(path: string): string {
  const crlf = String.fromCharCode(13, 10);
  const lf = String.fromCharCode(10);
  return readFileSync(path, "utf8").split(crlf).join(lf);
}

/** Every route folder under the storefront that holds a page, as "a/b" or "a/[id]". */
function pageFolders(dir: string, prefix = ""): string[] {
  const found: string[] = [];
  const entries = readdirSync(dir);
  if (prefix !== "" && entries.includes("page.tsx")) {
    found.push(prefix);
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) {
      continue;
    }
    const isGroup = entry.startsWith("(") && entry.endsWith(")");
    found.push(...pageFolders(path, isGroup ? prefix : prefix === "" ? entry : `${prefix}/${entry}`));
  }
  return found;
}

function rule(): void {
  const good = [
    "/",
    "/shop",
    "/shop/",
    "/shop?brand=msi&sort=price",
    "/deals#top",
    "/category/laptops",
    "/product/msi-pro-b860m-e",
    "/brand/msi",
    "/blog/gaming-laptop-guide",
    "/offers/eid-sale",
    "/pc-builder",
    "/pc-builder/select/cpu",
    "/checkout/payment/return",
    "  /about  ",
  ];
  for (const href of good) {
    check(`${JSON.stringify(href)} is accepted`, checkStorefrontLink(href).ok);
  }

  // The three links that were actually saved on the live site, and other junk.
  const bad = [
    "/DHFH",
    "/BCBB",
    "/hfufjfu",
    "",
    "   ",
    "shop",
    "//evil.example/shop",
    "https://example.com/shop",
    "javascript:alert(1)",
    "/shop/extra",
    "/product",
    "/product/",
    "/product/a/b",
    "/category",
    "/brand",
    "/Shop",
    "/PC-Builder",
    "/pc-builders",
    "/pc-builder/select",
    "/ shop",
    "/shop path",
    "/shop" + String.fromCharCode(92) + "x",
    "/sh" + String.fromCharCode(10) + "op",
    "/account/orders/1/2",
  ];
  for (const href of bad) {
    const result = checkStorefrontLink(href);
    check(`${JSON.stringify(href)} is refused`, !result.ok);
  }
  const refused = checkStorefrontLink("/DHFH");
  check(
    "the refusal names the page and gives examples",
    !refused.ok && refused.message.includes("/DHFH") && refused.message.includes("/shop"),
  );

  const product = checkStorefrontLink("/product/msi-pro-b860m-e?x=1#y");
  check(
    "a product link reports its kind and slug, ignoring query and hash",
    product.ok && product.kind === "product" && product.slug === "msi-pro-b860m-e" && product.path === "/product/msi-pro-b860m-e",
  );
  const category = checkStorefrontLink("/category/laptops/");
  check("a category link reports its kind and slug, ignoring a trailing slash", category.ok && category.kind === "category" && category.slug === "laptops");
  const brand = checkStorefrontLink("/brand/costume");
  check("a brand link reports its kind and slug", brand.ok && brand.kind === "brand" && brand.slug === "costume");
  const encoded = checkStorefrontLink("/product/a%20b");
  check("an encoded slug is decoded for the lookup", encoded.ok && encoded.slug === "a b");
  const blog = checkStorefrontLink("/blog/gaming-laptop-guide");
  check("a blog link has no slug lookup (kind is null)", blog.ok && blog.kind === null && blog.slug === null);
  const shop = checkStorefrontLink("/shop?x=1");
  check("a fixed page has no slug lookup", shop.ok && shop.kind === null && shop.path === "/shop");
}

function capitals(): void {
  // The live footer's "About us" link was stored as "/About": a 404, because the
  // router is case-sensitive. These are the rules that fix it everywhere.
  const fixes: [string, string][] = [
    ["/About", "/about"],
    ["/ABOUT", "/about"],
    ["/Shop", "/shop"],
    ["/Pc-Builder", "/pc-builder"],
    ["/PC-BUILDER/select/cpu", "/pc-builder/select/cpu"],
    ["/Product/MSI-Pro-B860M-E", "/product/MSI-Pro-B860M-E"],
    ["/CATEGORY/Laptops", "/category/Laptops"],
    ["/Track/TH-20260905-440567CE", "/track/TH-20260905-440567CE"],
    ["/About/", "/about"],
    ["/Checkout/Payment/Return", "/checkout/payment/return"],
  ];
  for (const [wrong, right] of fixes) {
    check(`${wrong} is corrected to ${right}`, canonicalStorefrontPath(wrong) === right);
  }
  for (const fine of ["/", "/about", "/shop", "/product/Some-Slug", "/DHFH", "/Admin", "/admin/Orders", "/_next/static/x", "/uploads/Logo.png", "/api/Thing", "//About", "About", ""]) {
    check(`${JSON.stringify(fine)} is left alone (already right, or not a storefront page)`, canonicalStorefrontPath(fine) === null);
  }
  check("a fixed page with extra segments is not 'corrected' into a page that does not exist", canonicalStorefrontPath("/About/team") === null && canonicalStorefrontPath("/Product/a/b") === null);
  check("an operator-typed link keeps its query and hash while its capitals are fixed", normalizeStorefrontHref("/About?x=1#team") === "/about?x=1#team" && normalizeStorefrontHref("/Shop#top") === "/shop#top");
  check(
    "external links, anchors and already-right links come back unchanged",
    normalizeStorefrontHref("https://Example.com/About") === "https://Example.com/About" &&
      normalizeStorefrontHref("#About") === "#About" &&
      normalizeStorefrontHref("/about") === "/about" &&
      normalizeStorefrontHref("/DHFH") === "/DHFH" &&
      normalizeStorefrontHref("mailto:Someone@Example.com") === "mailto:Someone@Example.com",
  );
  const refused = checkStorefrontLink("/About");
  check("saving a banner link with the wrong capitals suggests the right one", !refused.ok && refused.message.includes("Did you mean /about?"));

  // The footer: stored with the wrong case, rendered with the right one.
  const config = parseFooterWidgetsConfig({
    columns: [
      {
        id: "company",
        title: "Company",
        links: [
          { id: "link-about-us", label: "About us", href: "/About" },
          { id: "link-terms", label: "Terms", href: "/TERMS?x=1" },
          { id: "link-ext", label: "Facebook", href: "https://Facebook.com/Page" },
          { id: "link-odd", label: "Odd", href: "/DHFH" },
        ],
      },
    ],
  });
  const links = config.columns.flatMap((column) => column.links.map((link) => [link.id, link.href]));
  const hrefOf = (id: string) => links.find(([key]) => key === id)?.[1];
  check("the footer renders '/About' as '/about'", hrefOf("link-about-us") === "/about");
  check("the footer keeps a query string while fixing the capitals", hrefOf("link-terms") === "/terms?x=1");
  check("the footer leaves an external URL's capitals alone", (hrefOf("link-ext") ?? "").startsWith("https://facebook.com/Page") || (hrefOf("link-ext") ?? "").startsWith("https://Facebook.com/Page"));
  check("the footer does not invent a page for an unknown link", hrefOf("link-odd") === "/DHFH");

  // Wiring: the redirect, its matcher, the footer, and the favicon.
  const middleware = source("middleware.ts");
  check(
    "the middleware redirects a wrong-case storefront path permanently, for GET and HEAD only",
    middleware.includes('import { canonicalStorefrontPath } from "@/lib/design/storefront-link"') &&
      middleware.includes("canonicalStorefrontPath(pathname)") &&
      middleware.includes("NextResponse.redirect(target, 308)") &&
      middleware.includes('request.method === "GET" || request.method === "HEAD"'),
  );
  check(
    "the redirect keeps the query string (it clones the request URL and only swaps the path)",
    middleware.includes("request.nextUrl.clone()") && middleware.includes("target.pathname = canonical"),
  );
  check(
    "the middleware matcher still covers account, admin and b2b, and adds paths with a capital letter",
    middleware.includes('"/account/:path*"') && middleware.includes('"/admin/:path*"') && middleware.includes('"/b2b/:path*"') && middleware.includes('"/((?=.*[A-Z]).*)"'),
  );
  check(
    "the redirect runs before the admin gate and never touches admin paths",
    middleware.indexOf("canonicalStorefrontPath(pathname)") < middleware.indexOf('if (pathname.startsWith("/admin")) {') &&
      canonicalStorefrontPath("/Admin/login") === null &&
      canonicalStorefrontPath("/admin") === null,
  );
  check("the footer sanitizer applies the capital-letter fix", source("lib/content/footer-settings.ts").includes("return normalizeStorefrontHref(href);"));
  const favicon = source("app/favicon.ico/route.ts");
  check(
    "/favicon.ico redirects to the configured favicon or logo and otherwise answers 204, never 404",
    favicon.includes("branding.faviconSrc || branding.logoSrc") && favicon.includes("NextResponse.redirect") && favicon.includes("status: 204") && !favicon.includes("status: 404") && !favicon.includes("notFound"),
  );
}

function drift(): void {
  const folders = pageFolders("app/(storefront)");
  const staticFolders = folders.filter((f) => !f.includes("[")).sort();
  const dynamicFolders = folders
    .filter((f) => f.includes("["))
    .map((f) => f.slice(0, f.lastIndexOf("/[")))
    .sort();

  const missingStatic = staticFolders.filter((f) => !STOREFRONT_STATIC_PATHS.includes(f));
  const staleStatic = STOREFRONT_STATIC_PATHS.filter((p) => !staticFolders.includes(p));
  check(`every storefront page folder is in STOREFRONT_STATIC_PATHS (missing: ${missingStatic.join(", ") || "none"})`, missingStatic.length === 0);
  check(`STOREFRONT_STATIC_PATHS names no page that does not exist (stale: ${staleStatic.join(", ") || "none"})`, staleStatic.length === 0);

  const missingDynamic = dynamicFolders.filter((f) => !STOREFRONT_DYNAMIC_PREFIXES.includes(f));
  const staleDynamic = STOREFRONT_DYNAMIC_PREFIXES.filter((p) => !dynamicFolders.includes(p));
  check(`every dynamic storefront page is in STOREFRONT_DYNAMIC_PREFIXES (missing: ${missingDynamic.join(", ") || "none"})`, missingDynamic.length === 0);
  check(`STOREFRONT_DYNAMIC_PREFIXES names no page that does not exist (stale: ${staleDynamic.join(", ") || "none"})`, staleDynamic.length === 0);
  check("the page folders were found at all (a broken walk must not pass the checks above)", staticFolders.length > 40 && dynamicFolders.length >= 10);
}

function wiring(): void {
  const banners = source("lib/design/home-banners.ts");
  check(
    "saving a banner checks the link with the shared rule",
    banners.includes('import { checkStorefrontLink } from "@/lib/design/storefront-link"') &&
      banners.includes("const link = checkStorefrontLink(href);") &&
      banners.includes("if (!link.ok) return fail(link.message);"),
  );
  check(
    "saving a banner also checks that a product, category or brand slug exists",
    banners.includes("storefrontSlugExists(link.kind, link.slug)") &&
      banners.includes("prisma.product.findFirst") &&
      banners.includes("prisma.category.findFirst") &&
      banners.includes("prisma.brand.findFirst"),
  );
  check(
    "the old 'starts with /' test is gone (it let /DHFH through)",
    !banners.includes('!href.startsWith("/")'),
  );
  const checkIndex = banners.indexOf("const link = checkStorefrontLink(href);");
  const writeIndex = banners.indexOf("const row = input.id");
  check("the link is checked before anything is written", checkIndex > 0 && writeIndex > checkIndex);

  // Every component that renders an operator-typed banner link must not prefetch it.
  const linkSites: [string, string][] = [
    ["features/home/home-hero-slider.tsx", "href={slide.href}\n            prefetch={false}"],
    ["features/home/home-hero.tsx", "href={promo.href}\n                  prefetch={false}"],
    ["features/home/home-banners.tsx", "href={banner.href}\n      prefetch={false}"],
    ["features/product/product-page-banner.tsx", "<Link href={banner.href} prefetch={false}"],
  ];
  for (const [path, needle] of linkSites) {
    check(`${path} does not prefetch an operator-typed banner link`, source(path).includes(needle));
  }
}

function main(): void {
  rule();
  capitals();
  drift();
  wiring();

  if (failures > 0) {
    console.error(`\nstorefront links: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`storefront links ok — ${checks} checks`);
}

main();
