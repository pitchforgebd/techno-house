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

import {
  STOREFRONT_DYNAMIC_PREFIXES,
  STOREFRONT_STATIC_PATHS,
  checkStorefrontLink,
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
  drift();
  wiring();

  if (failures > 0) {
    console.error(`\nstorefront links: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`storefront links ok — ${checks} checks`);
}

main();
