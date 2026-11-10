/**
 * Security baseline suite (P17-T01).
 *
 *   npm run test:security
 *
 * Covers non-payment controls from docs/SECURITY.md. Payment cases stay in
 * `npm run test:payments` (P17-T02 / P13-T07). Does not print secrets.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { originMatchesHost } from "../../lib/auth/same-origin";
import { serializeJsonLd } from "../../lib/seo/serialize-json-ld";
import {
  sanitizeBlogBody,
  sanitizeRichBody,
} from "../../lib/content/sanitize-html";
import { opaqueSessionCookieFlags } from "../../lib/auth/session-cookie";
import {
  safeAdminReturnPath,
  safeReturnPath,
} from "../../lib/auth/return-path";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "generated") {
      continue;
    }
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      walkTsFiles(path, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

function main(): void {
  check(
    "safe path keeps /account/orders",
    safeReturnPath("/account/orders") === "/account/orders",
  );
  check(
    "safe path rejects //evil",
    safeReturnPath("//evil.example") === "/account",
  );
  check(
    "safe path rejects absolute url",
    safeReturnPath("https://evil.example") === "/account",
  );
  check(
    "safe path rejects protocol in path",
    safeReturnPath("/account/https://evil.example") === "/account",
  );
  check(
    "admin path keeps /admin/orders",
    safeAdminReturnPath("/admin/orders") === "/admin/orders",
  );
  check(
    "admin path rejects storefront",
    safeAdminReturnPath("/account") === "/admin",
  );
  check(
    "admin path rejects login loop",
    safeAdminReturnPath("/admin/login") === "/admin",
  );
  check(
    "admin path rejects access gate loop",
    safeAdminReturnPath("/admin/access/th-ops-local") === "/admin",
  );
  check(
    "admin path rejects //evil",
    safeAdminReturnPath("//evil.example") === "/admin",
  );

  check(
    "origin match same host",
    originMatchesHost("https://shop.example", "shop.example"),
  );
  check(
    "origin reject foreign host",
    !originMatchesHost("https://evil.example", "shop.example"),
  );
  check(
    "origin reject bad url",
    !originMatchesHost("not-a-url", "shop.example"),
  );

  const flags = opaqueSessionCookieFlags("/");
  check("cookie httpOnly", flags.httpOnly === true);
  check("cookie sameSite lax", flags.sameSite === "lax");
  check("cookie path set", flags.path === "/");

  const root = join(process.cwd());
  const files = [
    ...walkTsFiles(join(root, "app")),
    ...walkTsFiles(join(root, "components")),
    ...walkTsFiles(join(root, "features")),
    ...walkTsFiles(join(root, "lib")),
  ];
  // Raw-HTML sinks: an allowlist, not a blanket ban.
  //
  // The blanket ban had been failing for months, because six legitimate sinks
  // were added after it was written. A permanently-red check stops being a
  // check — the next genuinely unsafe sink would have been indistinguishable
  // from the existing noise. Each entry below records WHY that sink is safe,
  // and anything not listed still fails.
  const ALLOWED_HTML_SINKS: Record<string, string> = {
    "app/(storefront)/blog/[slug]/page.tsx":
      "JSON-LD via serializeJsonLd (escapes < so a value cannot close the script element), plus sanitizeBlogBody output (tag allowlist, no style/class/on*, http/https/mailto only)",
    "app/(storefront)/layout.tsx":
      "theme CSS built from hex-validated colours and a fixed font lookup map",
    "app/(storefront)/offers/[slug]/page.tsx":
      "Promotion.descriptionHtml (Terms & conditions): sanitizeRichBody on save, and sanitizeBlogBody again on read in this page before it reaches the raw-HTML div — asserted below",
    "components/layout/marquee-notice-bar.tsx":
      "marquee notice text: sanitizeMarqueeHtml (sanitizeRichBody, tag allowlist, 2000-char cap) inside parseFooterWidgetsConfig, which both saveFooterWidgetsConfig and getFooterWidgetsConfig run; the component only demotes headings in that already-sanitized HTML",
    "components/seo/json-ld-script.tsx":
      "JSON-LD via serializeJsonLd: JSON.stringify with < escaped as a unicode escape, so no value can close the script element — asserted below",
    "components/analytics/custom-script-slot.tsx":
      "intentional third-party script injection, gated on custom_scripts.manage and audit-logged (F-09, accepted risk)",
    "features/catalog/category-intro-block.tsx":
      "category intro and FAQ answers: built in lib/content/category-intro.ts from repo files under content/ (not user or database input) through HTML-escaping and sanitizeBlogBody",
    "features/catalog/category-page-seo.tsx":
      "sanitizeBlogBody output, sanitized on read as well as on write",
    "features/content/storefront-content-page.tsx": "sanitizeBlogBody output",
    "features/home/home-store-info.tsx": "sanitizeBlogBody output",
    "features/product/product-details-panel.tsx":
      "Product.detailsHtml: sanitizeRichBody on save, and sanitizeBlogBody again on read in the product page before it is passed here (the only caller) — asserted below",
    "features/product/product-summary.tsx":
      "Product.overviewHtml: sanitizeRichBody on save, and sanitizeBlogBody again on read in the product page before it is passed down (the only caller) — asserted below",
  };

  let unexpectedHtmlSinks = 0;
  const seenSinks = new Set<string>();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (!text.includes("dangerouslySetInnerHTML")) {
      continue;
    }
    const relative = file
      .slice(root.length + 1)
      .split("\\")
      .join("/");
    if (relative in ALLOWED_HTML_SINKS) {
      seenSinks.add(relative);
      continue;
    }
    unexpectedHtmlSinks += 1;
    console.error(`fail unreviewed dangerouslySetInnerHTML in ${relative}`);
  }
  check(
    "no unreviewed dangerouslySetInnerHTML in app sources",
    unexpectedHtmlSinks === 0,
  );
  // The two product-page sinks above are only safe because the page sanitises
  // on read. If that call goes, the allowlist entries become a lie, so pin it.
  const productPage = readFileSync(
    join(root, "app/(storefront)/product/[slug]/page.tsx"),
    "utf8",
  );
  check(
    "the product page sanitises overviewHtml and detailsHtml before the raw-HTML panels receive them",
    productPage.includes("sanitizeBlogBody(product.overviewHtml)") &&
      productPage.includes("sanitizeBlogBody(product.detailsHtml)"),
  );
  // The offers page's terms are only safe because the page sanitises on read
  // (the column is also reachable by direct database edits). If that call goes,
  // the allowlist entry becomes a lie, so pin it.
  const offersPage = readFileSync(
    join(root, "app/(storefront)/offers/[slug]/page.tsx"),
    "utf8",
  );
  check(
    "the offers page sanitises promotion.descriptionHtml before the raw-HTML div receives it",
    offersPage.includes("sanitizeBlogBody(promotion.descriptionHtml)") &&
      !offersPage.includes("__html: promotion.descriptionHtml"),
  );
  // Sanitising on read must not change terms the admin editor saved normally
  // (paragraphs, lists, links, bold, a table): same HTML out as in.
  const savedTerms = sanitizeRichBody(
    `<h3>Offer terms</h3><p>Free delivery over <strong>৳25,000</strong>. <em>Some items excluded.</em></p>` +
      `<ul><li><p>Valid until 31 December 2026</p></li><li><p>One use per customer</p></li></ul>` +
      `<ol><li>Add items to your cart</li><li>Pay at checkout</li></ol>` +
      `<p>See our <a href="/shipping" target="_blank">delivery policy</a> or <a href="https://example.com/terms" target="_blank">partner terms</a>.</p>` +
      `<table><thead><tr><th>Area</th><th>Charge</th></tr></thead><tbody><tr><td>Dhaka</td><td>Free</td></tr></tbody></table>` +
      `<blockquote>Terms may change without notice.</blockquote>`,
    { maxLength: 20000, tooLongError: "too long" },
  );
  const savedHtml = savedTerms.ok ? (savedTerms.value ?? "") : "";
  check(
    "sanitising saved promotion terms again on read changes nothing",
    savedHtml.includes("<ul>") && sanitizeBlogBody(savedHtml) === savedHtml,
  );
  const hostileTerms = sanitizeBlogBody(
    `<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a>`,
  );
  check(
    "a hostile value written straight to the database is neutralised on read",
    !/<script|onerror|javascript:|<img/i.test(hostileTerms) &&
      hostileTerms.includes("<p>ok</p>"),
  );
  // The marquee and category-intro entries rest on their sanitising callers.
  check(
    "marquee text is sanitised in parseFooterWidgetsConfig (run on both save and read)",
    readFileSync(join(root, "lib/content/footer-settings.ts"), "utf8").includes(
      "marqueeText: sanitizeMarqueeHtml(",
    ),
  );
  check(
    "category intro HTML goes through sanitizeBlogBody",
    readFileSync(join(root, "lib/content/category-intro.ts"), "utf8").includes(
      "introHtml: sanitizeBlogBody(",
    ),
  );
  // JSON-LD: JSON.stringify alone lets a value containing the closing script
  // tag break out of the <script> element. Both sinks must go through
  // serializeJsonLd, and it must actually prevent the breakout.
  const hostile = {
    name: "</script><script>alert(1)</script>",
    note: "<!-- x -->",
    sep: "a\u2028b",
  };
  const serialized = serializeJsonLd(hostile);
  check(
    "serializeJsonLd leaves no < in the output, so nothing can close the script element",
    !serialized.includes("<"),
  );
  check(
    "serializeJsonLd output parses back to exactly the original data",
    JSON.stringify(JSON.parse(serialized)) === JSON.stringify(hostile),
  );
  check(
    "serializeJsonLd escapes the JS line separators and tolerates undefined",
    !serialized.includes(String.fromCharCode(0x2028)) &&
      serializeJsonLd(undefined) === "null",
  );
  const jsonLdComponent = readFileSync(
    join(root, "components/seo/json-ld-script.tsx"),
    "utf8",
  );
  const blogPage = readFileSync(
    join(root, "app/(storefront)/blog/[slug]/page.tsx"),
    "utf8",
  );
  check(
    "both JSON-LD sinks serialise through serializeJsonLd, not raw JSON.stringify",
    jsonLdComponent.includes("serializeJsonLd(data)") &&
      !jsonLdComponent.includes("__html: JSON.stringify") &&
      blogPage.includes("serializeJsonLd(jsonLd)") &&
      !blogPage.includes("__html: JSON.stringify"),
  );
  // Keeps the allowlist honest: a sink that is removed should be removed from
  // the list too, or the list slowly becomes a record of things that no longer
  // exist and stops meaning anything.
  const staleSinks = Object.keys(ALLOWED_HTML_SINKS).filter(
    (entry) => !seenSinks.has(entry),
  );
  check(
    "the raw-HTML allowlist has no stale entries",
    staleSinks.length === 0,
    staleSinks.join(", "),
  );

  console.log(
    failures === 0
      ? `security baseline ok (${checks} checks)`
      : `security baseline failed (${failures}/${checks})`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main();
