/**
 * SEO phase 6 checks: the eight trust pages.
 *
 *   npm run test:seo-phase6                                   # offline
 *   npm run test:seo-phase6 -- --base=http://127.0.0.1:3200   # + the running site
 *   npm run test:seo-phase6 -- --base=… --mobile              # + 375px layout (headless Chrome)
 *
 * Offline: the content file parses into eight pages, every policy value in it
 * is tokenized (none left spelled out), tokens fill back to the exact text,
 * the empty-body fallback is still in place, and the owner decisions of
 * 2026-11-10 are in the content file.
 *
 * With --base, for /about /contact /faq /warranty /shipping /returns /terms
 * /privacy: 200; title + meta description equal the content file and are
 * unique; one H1 (the content file's); h1 > h2 > h3 order; canonical; no
 * noindex; every JSON-LD block parses (BreadcrumbList on all, AboutPage /
 * ContactPage / FAQPage where they belong, FAQPage = the file's questions);
 * every internal link resolves (redirects are listed); phones and emails
 * match lib/site/policies.ts; no "placeholder" / "under development" /
 * "lorem" / "TODO" in the page content; the figures agree with policies.ts;
 * all eight are in sitemap-pages.xml and linked from the header or footer.
 * Against a local server it first proves the server is the build in .next
 * (not a stale one). Exit code 1 on any failure. Reads only.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { faqItemsFromHtml, merchantReturnPolicyJsonLd, offerShippingDetailsJsonLd, productJsonLd } from "@/lib/seo/json-ld";
import { displayedOffer } from "@/lib/catalog/displayed-offer";
import type { ProductDetail } from "@/lib/data";
import {
  MERCHANT_RETURN_POLICY_MARKUP,
  POLICIES,
  POLICY_TOKENS,
  fillPolicyTokens,
  fillPolicyTokensText,
  workingDayRange,
} from "@/lib/site/policies";
import {
  TRUST_PAGE_SLUGS,
  buildTrustPageRecord,
  parseTrustPages,
  trustMarkdownToHtml,
  type TrustPageSlug,
  type TrustPageSource,
} from "@/lib/site/trust-pages-markdown";

let checks = 0;
let failures = 0;
function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}
const equal = (name: string, actual: unknown, expected: unknown) =>
  check(name, actual === expected, `expected ${String(expected)}\n  actual   ${String(actual)}`);

const arg = (name: string) =>
  process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");
const CANONICAL_ORIGIN = "https://technohouse.com.bd";

const decode = (text: string) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const plain = (html: string) =>
  decode(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Offline
// ---------------------------------------------------------------------------

const contentFile = read("docs/SITE-PAGES-CONTENT.md");
const sources = parseTrustPages(contentFile);
const bySlug = new Map(sources.map((page) => [page.slug, page]));

equal("content file has the eight pages", sources.length, 8);
for (const page of sources) {
  let built: ReturnType<typeof buildTrustPageRecord> | null = null;
  try {
    built = buildTrustPageRecord(page);
  } catch (error) {
    check(`/${page.slug}: every policy value is tokenized`, false, String(error));
  }
  if (!built) continue;
  // Filling the tokens gives back exactly the content file's text.
  equal(
    `/${page.slug}: tokens fill back to the content file text`,
    fillPolicyTokens(built.body),
    trustMarkdownToHtml(page.markdown, { faq: page.slug === "faq" }),
  );
  equal(`/${page.slug}: meta description round-trips`, fillPolicyTokensText(built.metaDescription), page.metaDescription);
  check(`/${page.slug}: no token left after filling (except the map link)`, !/\{\{(?!googleMapsUrl\}\})/.test(fillPolicyTokens(built.body)));
  check(`/${page.slug}: has h2 sections`, built.body.includes("<h2>"));
  check(`/${page.slug}: no h1 in the body (the title is the H1)`, !/<h1/i.test(built.body));
}
equal("token: supportHours", POLICY_TOKENS.supportHours, "9:00 AM – 10:00 PM");
equal("token: showroomAddress", POLICY_TOKENS.showroomAddress, "85, Laboratory Road (Coffee House Goli), New Elephant Road, Dhaka-1205, Bangladesh");
equal("token: rmaAddress", POLICY_TOKENS.rmaAddress, "85/1, 2nd Floor, Laboratory Road (Coffee House Goli), New Elephant Road, Dhaka-1205");
equal("token: phonesSales", POLICY_TOKENS.phonesSales, "01611-305338, 01410-305338, 01410-881771");

// Owner decisions, 2026-11-10.
check("shipping: hand-over SMS sentence removed", !contentFile.includes("We send an SMS when your order is handed to the delivery team."));
check("shipping: tracking sentence added", bySlug.get("shipping")?.markdown.includes("You can follow your order on the tracking page at any time."));
check("shipping: order-confirmation SMS kept", bySlug.get("shipping")?.markdown.includes("we send an SMS with your order number"));
check(
  "faq: 'How do I place an order?' keeps sign-in (checkout requires an account)",
  bySlug.get("faq")?.markdown.includes("Sign in or create an account, enter your delivery address"),
);
check(
  "checkout still requires sign-in (FAQ answer is accurate)",
  read("lib/orders/create-order.ts").includes("const session = await getCustomerSession();") &&
    read("features/checkout/checkout-view.tsx").includes("Checkout requires a customer account."),
);

// Offer markup (owner decision, 2026-11-10): no hasMerchantReturnPolicy while
// /returns accepts only wrong/damaged/dead-on-arrival items; shippingDetails stays.
equal("return policy markup flag is off by default", MERCHANT_RETURN_POLICY_MARKUP, false);
{
  const offer = displayedOffer({
    name: "T", sku: "T-1", price: { amount: 1000, currency: "BDT" }, compareAtPrice: null,
    stockStatus: "in_stock", isPreOrder: false, isComingSoon: false, variantChoices: [],
    image: { src: "/uploads/products/a.webp", alt: "a" }, images: [],
  });
  const product = { brandName: "B", modelNumber: null, overview: ["x"], overviewHtml: null, discountEndsAt: null } as Pick<
    ProductDetail, "brandName" | "modelNumber" | "overview" | "overviewHtml" | "discountEndsAt"
  >;
  const offers = productJsonLd({ product, offer, path: "/product/t", policies: { returnsPage: true, shippingPage: true, returnable: true } }).offers as Record<string, unknown>;
  check("offer: no hasMerchantReturnPolicy even with /returns published", offers.hasMerchantReturnPolicy === undefined);
  check("offer: shippingDetails kept", JSON.stringify(offers.shippingDetails) === JSON.stringify(offerShippingDetailsJsonLd()));
  check("offer: no hasMerchantReturnPolicy without policies either", (productJsonLd({ product, offer, path: "/product/t" }).offers as Record<string, unknown>).hasMerchantReturnPolicy === undefined);
  // Kept, tested, ready for the flag.
  equal("return policy builder: finite window days", (merchantReturnPolicyJsonLd({ returnable: true }) as Record<string, unknown>).merchantReturnDays, POLICIES.reportDeadOnArrivalDays);
}

// Deploying the code before seeding changes nothing: empty body → placeholder.
const pagesLib = read("lib/content/pages.ts");
const component = read("features/content/storefront-content-page.tsx");
check("empty body → getStorefrontContentPage returns null", pagesLib.includes("if (!row || !row.body.trim()) {\n    return null;"));
check("null page → ContentStub (unchanged placeholder)", /if \(!page\) \{\s*return \(\s*<ContentStub/.test(component));
check("tokens are filled before sanitizing", component.includes("sanitizeBlogBody(fillPolicyTokens("));
check("sitemap lists the eight pages", TRUST_PAGE_SLUGS.every((slug) => read("lib/seo/sitemap.ts").includes(`"/${slug}"`)));

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

type Fetched = { status: number; text: string; headers: Headers; location: string | null };
async function get(base: string, path: string, redirect: RequestRedirect = "manual"): Promise<Fetched> {
  const response = await fetch(`${base}${path}`, { redirect, headers: { "User-Agent": "Mozilla/5.0 check-phase6" } });
  return { status: response.status, text: await response.text(), headers: response.headers, location: response.headers.get("location") };
}

/** The page body region (not the header, footer or marquee). */
function contentRegion(html: string): string {
  const start = html.search(/<div[^>]*data-page-content=/);
  if (start < 0) return "";
  // The rich-text div holds no nested divs, so the first </div> closes it.
  const end = html.indexOf("</div>", start);
  return html.slice(start, end < 0 ? undefined : end);
}

/** <main> … </main>: H1 + breadcrumbs + content, without header/footer. */
function mainRegion(html: string): string {
  const match = html.match(/<main[\s\S]*?<\/main>/);
  return match?.[0] ?? html;
}

const PHONE = /0\d{4}-\d{6}/g;
const EMAIL = /[\w.+-]+@technohouse\.com\.bd/gi;
const ALL_PHONES = [...POLICIES.phonesSales, POLICIES.phoneRma] as string[];
const ALL_EMAILS = [POLICIES.emailSupport, POLICIES.emailInfo] as string[];

/** Figures each page must state, from policies.ts (the task's list). */
const FIGURES: Record<TrustPageSlug, string[]> = {
  shipping: [
    `${POLICIES.reportWrongOrDamagedHours} hours`,
    `${workingDayRange(POLICIES.dhakaDeliveryWorkingDays)} working days`,
    `${workingDayRange(POLICIES.outsideDhakaDeliveryWorkingDays)} working days`,
    `${workingDayRange(POLICIES.dispatchAfterConfirmationWorkingDays)} working days`,
  ],
  returns: [
    `${POLICIES.reportWrongOrDamagedHours} hours`,
    `${POLICIES.reportDeadOnArrivalDays} days`,
    `${POLICIES.refundWorkingDays} working days`,
  ],
  faq: [
    `${POLICIES.reportWrongOrDamagedHours} hours`,
    `${POLICIES.reportDeadOnArrivalDays} days`,
    `${POLICIES.refundWorkingDays} working days`,
    `${workingDayRange(POLICIES.dhakaDeliveryWorkingDays)} working days`,
    `${workingDayRange(POLICIES.outsideDhakaDeliveryWorkingDays)} working days`,
  ],
  terms: [`${POLICIES.refundWorkingDays} working days`],
  about: [],
  contact: [],
  warranty: [],
  privacy: [],
};

/** Every "N hours" / "N days" / "N working days" on the page must be a policy value. */
function strayFigures(text: string): string[] {
  const allowed = new Set([
    `${POLICIES.reportWrongOrDamagedHours} hours`,
    `${POLICIES.reportDeadOnArrivalDays} days`,
    `${POLICIES.refundWorkingDays} working days`,
    ...[POLICIES.dhakaDeliveryWorkingDays, POLICIES.outsideDhakaDeliveryWorkingDays, POLICIES.dispatchAfterConfirmationWorkingDays].map(
      (range) => `${workingDayRange(range)} working days`,
    ),
  ]);
  return [...text.matchAll(/\b\d+(?:–\d+)?\s+(?:working\s+days|days?|hours?)\b/g)]
    .map((match) => match[0])
    .filter((figure) => !allowed.has(figure));
}

async function assertFreshBuild(base: string): Promise<void> {
  const host = new URL(base).hostname;
  if (!["127.0.0.1", "localhost"].includes(host)) return;
  const buildIdFile = join(root, ".next", "BUILD_ID");
  check("local run: .next/BUILD_ID exists", existsSync(buildIdFile));
  if (!existsSync(buildIdFile)) return;
  const buildId = readFileSync(buildIdFile, "utf8").trim();
  const manifest = await get(base, `/_next/static/${buildId}/_buildManifest.js`);
  check(`server on ${base} is the build in .next (${buildId})`, manifest.status === 200, `status ${manifest.status}: a stale server is answering`);
  console.log(`build: ${buildId} → ${manifest.status}`);
}

async function live(base: string): Promise<void> {
  await assertFreshBuild(base);
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  const linkCache = new Map<string, { status: number; via: string }>();
  const redirects: string[] = [];
  const sitemap = await get(base, "/sitemap-pages.xml");
  equal("sitemap-pages.xml 200", sitemap.status, 200);

  for (const slug of TRUST_PAGE_SLUGS) {
    const source = bySlug.get(slug) as TrustPageSource;
    const path = `/${slug}`;
    const page = await get(base, path);
    equal(`${path}: 200`, page.status, 200);
    if (page.status !== 200) continue;
    const html = page.text;
    const head = html.slice(0, html.indexOf("</head>"));
    const main = mainRegion(html);
    const content = contentRegion(html);
    check(`${path}: published body rendered (not the placeholder)`, content.length > 0);

    // Title / description / canonical / robots
    const title = decode(head.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const description = decode(head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
    equal(`${path}: title = content file`, title, source.metaTitle);
    equal(`${path}: meta description = content file`, description, source.metaDescription);
    check(`${path}: title unique`, !titles.has(title), titles.get(title));
    check(`${path}: description unique`, !descriptions.has(description), descriptions.get(description));
    titles.set(title, path);
    descriptions.set(description, path);
    const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    equal(`${path}: canonical`, canonical, `${CANONICAL_ORIGIN}${path}`);
    check(`${path}: no noindex`, !/<meta name="robots" content="[^"]*noindex/i.test(head) && !/noindex/i.test(page.headers.get("x-robots-tag") ?? ""));
    // Path only: a local server prints its own origin in <loc>.
    check(`${path}: in sitemap-pages.xml`, new RegExp(`<loc>https?://[^<]+${path}</loc>`).test(sitemap.text));

    // Headings
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((match) => plain(match[1] ?? ""));
    equal(`${path}: exactly one H1`, h1s.length, 1);
    equal(`${path}: H1 = content file`, h1s[0], source.title);
    const levels = [...content.matchAll(/<h([2-6])[\s>]/g)].map((match) => Number(match[1]));
    check(`${path}: first content heading is h2`, levels[0] === 2, levels.join(","));
    check(
      `${path}: heading levels never skip (h1 > h2 > h3)`,
      levels.every((level, index) => index === 0 || level <= (levels[index - 1] ?? 2) + 1),
      levels.join(","),
    );

    // JSON-LD
    const blocks: Record<string, unknown>[] = [];
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        blocks.push(JSON.parse(match[1] ?? "") as Record<string, unknown>);
      } catch (error) {
        check(`${path}: JSON-LD parses`, false, String(error));
      }
    }
    const ofType = (type: string) => blocks.filter((block) => block["@type"] === type);
    const crumbs = ofType("BreadcrumbList")[0]?.itemListElement as { name: string; item?: string }[] | undefined;
    check(`${path}: BreadcrumbList Home > page`, crumbs?.length === 2 && crumbs[0]?.name === "Home" && crumbs[0]?.item === `${CANONICAL_ORIGIN}/` && crumbs[1]?.name === source.title, JSON.stringify(crumbs));
    equal(`${path}: AboutPage`, ofType("AboutPage").length, slug === "about" ? 1 : 0);
    equal(`${path}: ContactPage`, ofType("ContactPage").length, slug === "contact" ? 1 : 0);
    equal(`${path}: FAQPage`, ofType("FAQPage").length, slug === "faq" ? 1 : 0);
    check(`${path}: no rating/review markup`, !/"aggregateRating"|"review"/.test(JSON.stringify(blocks)));
    if (slug === "faq") {
      const expected = faqItemsFromHtml(trustMarkdownToHtml(source.markdown, { faq: true }));
      const entities = (ofType("FAQPage")[0]?.mainEntity ?? []) as { name: string; acceptedAnswer: { text: string } }[];
      const actual = entities.map((entity) => ({ question: entity.name, answer: entity.acceptedAnswer?.text }));
      equal("/faq: FAQPage questions = content file", JSON.stringify(actual), JSON.stringify(expected));
      equal("/faq: question count", actual.length, (source.markdown.match(/^\*\*.+\*\*$/gm) ?? []).length);
    }
    if (slug === "contact") {
      const store = ofType("ElectronicsStore")[0];
      const mapHref = decode(content.match(/<a href="([^"]+)"[^>]*>Open in Google Maps<\/a>/)?.[1] ?? "");
      // The Business Settings map link (= hasMap); a maps search for the
      // showroom address only when none is set (then there is no hasMap).
      const expected = store?.hasMap ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(POLICIES.showroomAddress)}`;
      check("/contact: 'Open in Google Maps' = the store's hasMap link", mapHref === expected, `${mapHref} vs ${String(expected)}`);
      console.log(`/contact map link: ${mapHref}${store?.hasMap ? " (= hasMap)" : " (fallback: no map link in Business Settings)"}`);
    }

    // Text checks on the page content only (the header carries search-box
    // placeholders and the site-wide "under development" notice).
    const text = plain(content);
    const forbidden = text.match(/placeholder|under development|lorem/i)?.[0] ?? text.match(/\bTODO\b/)?.[0] ?? plain(main).match(/\{\{[^}]*\}\}/)?.[0];
    check(`${path}: no placeholder/under development/lorem/TODO/{{token}}`, !forbidden, forbidden);
    const phones = [...new Set(text.match(PHONE) ?? [])];
    const emails = [...new Set((text.match(EMAIL) ?? []).map((email) => email.toLowerCase()))];
    check(`${path}: phone numbers are policies.ts numbers`, phones.every((phone) => ALL_PHONES.includes(phone)), phones.join(", "));
    check(`${path}: emails are policies.ts emails`, emails.every((email) => ALL_EMAILS.includes(email)), emails.join(", "));
    if (slug === "contact") {
      check("/contact: lists every phone and email", ALL_PHONES.every((phone) => phones.includes(phone)) && ALL_EMAILS.every((email) => emails.includes(email)));
      check("/contact: support hours", text.includes(`Support hours: ${POLICIES.supportHoursFrom} – ${POLICIES.supportHoursTo}`));
    }
    for (const figure of FIGURES[slug]) {
      check(`${path}: states "${figure}"`, text.includes(figure));
    }
    const stray = strayFigures(text);
    check(`${path}: no other day/hour figures`, stray.length === 0, stray.join(", "));
    if (slug === "terms" || slug === "privacy") {
      check(`${path}: "Last updated: 10 November 2026"`, text.includes("Last updated: 10 November 2026"));
    }
    if (slug === "shipping") {
      check("/shipping: hand-over SMS sentence gone", !text.includes("handed to the delivery team"));
    }

    // Internal links (content + breadcrumbs) resolve without a 404.
    const hrefs = [...new Set([...main.matchAll(/<a [^>]*href="(\/[^"#]*)[^"]*"/g)].map((match) => decode(match[1] ?? "")))];
    for (const href of hrefs) {
      let result = linkCache.get(href);
      if (!result) {
        const first = await get(base, href);
        if (first.status >= 300 && first.status < 400) {
          const final = await get(base, href, "follow");
          result = { status: final.status, via: `${first.status} → ${first.location}` };
          redirects.push(`${href} ${first.status} → ${first.location}`);
        } else {
          result = { status: first.status, via: "" };
        }
        linkCache.set(href, result);
      }
      check(`${path}: link ${href} resolves`, result.status === 200, `${result.status} ${result.via}`);
    }

    // Header / footer link to all eight (checked once, on /about).
    if (slug === "about") {
      const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
      const nav = html.match(/<nav aria-label="Product categories"[\s\S]*?<\/nav>/)?.[0] ?? "";
      const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
      const missingFooter: string[] = [];
      for (const target of TRUST_PAGE_SLUGS) {
        const needle = `href="/${target}"`;
        if (!footer.includes(needle)) missingFooter.push(`/${target}`);
        check(`header or footer links /${target}`, header.includes(needle) || nav.includes(needle) || footer.includes(needle));
      }
      console.log(`footer links missing (footer columns are DB settings): ${missingFooter.join(", ") || "none"}`);
    }
  }
  console.log(`internal links checked: ${linkCache.size}; redirects: ${redirects.length ? redirects.join("; ") : "none"}`);
  await liveProducts(base);
}

/** Product pages: shippingDetails present on offers, hasMerchantReturnPolicy absent (flag off). */
async function liveProducts(base: string): Promise<void> {
  const index = await get(base, "/sitemap-products.xml");
  const listed = [...index.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1] ?? "").pathname);
  check("sitemap-products.xml lists products", listed.length > 0);
  // --products=slug,slug: products known to be priced and in stock; each must
  // carry an offer. Offers need stock, so a random sample may find none.
  const named = (arg("products")?.split(",").map((slug) => `/product/${slug.trim()}`).filter(Boolean)) ?? [];
  let withOffer = 0;
  let withShipping = 0;
  // Evenly spread over the whole sitemap: many listings have a hidden price
  // (no offer), so the first few products alone can all be offer-less.
  const step = Math.max(1, Math.floor(listed.length / 120));
  const sample = [...named, ...listed.filter((_, index) => index % step === 0).slice(0, 120)];
  for (const path of sample) {
    const page = await get(base, path);
    if (page.status !== 200) continue;
    for (const match of page.text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const block = JSON.parse(match[1] ?? "{}") as { "@type"?: string; offers?: Record<string, unknown> };
      if (block["@type"] !== "Product" || !block.offers) continue;
      withOffer += 1;
      check(`${path}: no hasMerchantReturnPolicy`, block.offers.hasMerchantReturnPolicy === undefined);
      if (block.offers.shippingDetails) {
        withShipping += 1;
        equal(`${path}: shippingDetails = policies.ts`, JSON.stringify(block.offers.shippingDetails), JSON.stringify(offerShippingDetailsJsonLd()));
      }
      check(`${path}: no shippingRate`, !JSON.stringify(block.offers).includes("shippingRate"));
    }
  }
  console.log(`product offers checked: ${withOffer} (with shippingDetails: ${withShipping})`);
  if (named.length > 0) {
    check("named products carry an offer with shippingDetails (needs /shipping published)", withShipping >= named.length, `${withShipping}/${named.length}`);
  } else if (withOffer === 0) {
    console.log("note: no sampled product has an offer (none in stock); pass --products=<in-stock slugs> to check them");
  }
}

/** 375px wide: nothing in the page content sticks out past the viewport. */
async function mobile(base: string): Promise<void> {
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const tab = await browser.newPage();
    await tab.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const slug of TRUST_PAGE_SLUGS) {
      await tab.goto(`${base}/${slug}`, { waitUntil: "networkidle0", timeout: 60_000 });
      const result = await tab.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const region = document.querySelector("main") ?? document.body;
        const over = [...region.querySelectorAll<HTMLElement>("*")]
          .filter((element) => {
            // Children of a horizontal scroller may extend past it on purpose.
            for (let node = element.parentElement; node && node !== region; node = node.parentElement) {
              const style = getComputedStyle(node);
              if (/(auto|scroll|hidden)/.test(style.overflowX)) return false;
            }
            return element.getBoundingClientRect().right > width + 1;
          })
          .map((element) => `${element.tagName.toLowerCase()}.${element.className}`.slice(0, 80));
        return { width, over: over.slice(0, 5), body: document.body.scrollWidth };
      });
      check(`/${slug} @375px: nothing wider than the viewport`, result.over.length === 0, result.over.join(" | "));
      check(`/${slug} @375px: no horizontal page scroll`, result.body <= result.width + 1, `${result.body} > ${result.width}`);
    }
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const base = arg("base")?.replace(/\/$/, "");
  if (base) {
    await live(base);
    if (process.argv.includes("--mobile")) await mobile(base);
  }
  console.log(failures === 0 ? `ok ${checks} phase-6 checks` : `failed ${failures}/${checks} phase-6 checks`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
