/**
 * JSON-LD validator (SEO phase 3).
 *
 *   npm run seo:check-schema -- --base=http://127.0.0.1:3000
 *   npm run seo:check-schema -- --base=https://technohouse.com.bd --products=40
 *   npm run seo:check-schema -- --offline          # builder unit checks only
 *   npm run seo:check-schema -- --base=… --dump=schema.json   # write every block
 *   npm run seo:check-schema -- --base=… --paths=/product/a,/product/b   # also these
 *
 * 1. Offline: unit checks of the builders in lib/seo/json-ld.ts and
 *    lib/catalog/displayed-offer.ts (phone/hours parsing, "never price 0",
 *    hidden price → no offers, no rating markup, absolute images).
 * 2. Crawl: home, contact, a few static pages, and a random sample of
 *    categories / brands / products from the sitemap. Every
 *    <script type="application/ld+json"> block must parse and carry the
 *    required fields for its @type; no aggregateRating/review anywhere; every
 *    URL absolute; a Product offer's price must appear on the page itself.
 * Exit code 1 on any failure. Reads pages only — writes nothing.
 */
import { writeFileSync } from "node:fs";
import {
  displayedOffer,
  isPublishablePrice,
} from "@/lib/catalog/displayed-offer";
import type { ProductDetail, ProductVariantChoice } from "@/lib/data";
import {
  absoluteUrl,
  bdPhoneE164,
  electronicsStoreJsonLd,
  productJsonLd,
  sameAsLinks,
} from "@/lib/seo/json-ld";
import { POLICIES } from "@/lib/site/policies";

type Json = Record<string, unknown>;

let checks = 0;
let failures = 0;
const failureLines: string[] = [];

function check(name: string, condition: unknown, detail = ""): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    failureLines.push(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * ElectronicsStore: no opening hours (support hours ≠ shop hours, not
 * confirmed yet) and a numeric geo inside Dhaka's lat/lng band.
 */
function checkStoreHoursAndGeo(where: string, block: Json): void {
  check(
    `${where}: no opening hours (shop hours not confirmed)`,
    block.openingHoursSpecification === undefined && block.openingHours === undefined,
  );
  const geo = block.geo as Json | undefined;
  check(`${where}: geo is GeoCoordinates`, geo?.["@type"] === "GeoCoordinates");
  check(
    `${where}: geo latitude numeric 23–24`,
    typeof geo?.latitude === "number" && geo.latitude >= 23 && geo.latitude <= 24,
    String(geo?.latitude),
  );
  check(
    `${where}: geo longitude numeric 90–91`,
    typeof geo?.longitude === "number" && geo.longitude >= 90 && geo.longitude <= 91,
    String(geo?.longitude),
  );
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

// ---------------------------------------------------------------------------
// 1. Offline builder checks
// ---------------------------------------------------------------------------

function offline(): void {
  check("phone 01611-305338", bdPhoneE164("01611-305338") === "+8801611305338");
  check("phone '0 1410-305338'", bdPhoneE164("0 1410-305338") === "+8801410305338");
  check("phone +880 form", bdPhoneE164("+880 1611 305338") === "+8801611305338");
  check("phone 880 form", bdPhoneE164("8801611305338") === "+8801611305338");
  check("phone garbage → null", bdPhoneE164("12345") === null);
  {
    // The "9:00–22:00" on the site is SUPPORT hours, not shop hours — the
    // store markup must not claim opening hours until they are confirmed.
    const store = electronicsStoreJsonLd(
      {
        storeName: "Techno House", supportEmail: "", phone: "01611-305338", phoneHref: "", emailHref: "",
        address: "85, Laboratory Road New Elephant Road Dhaka-1205", city: "Dhaka, Bangladesh",
        googleMapsUrl: "https://maps.app.goo.gl/x", extraAddresses: [], extraPhones: [], extraEmails: [],
        logoSrc: null, faviconSrc: null, logoHeightPx: 40,
      },
      {},
    ) as Json;
    checkStoreHoursAndGeo("builder ElectronicsStore", store);
    check("builder ElectronicsStore: hasMap kept", store.hasMap === "https://maps.app.goo.gl/x");
  }
  check(
    "sameAs keeps only https profiles",
    JSON.stringify(sameAsLinks([{ href: "/contact" }, { href: "https://youtube.com/@x" }, { href: "http://x.com" }])) ===
      '["https://youtube.com/@x"]',
  );
  check("absoluteUrl site path", absoluteUrl("/uploads/a.webp")?.endsWith("/uploads/a.webp") && /^https?:\/\//.test(absoluteUrl("/uploads/a.webp")!));
  check("absoluteUrl keeps https", absoluteUrl("https://cdn.x/a.png") === "https://cdn.x/a.png");
  check("absoluteUrl drops protocol-relative/data", absoluteUrl("//x/a.png") === undefined && absoluteUrl("data:image/png;base64,") === undefined);

  const money = (amount: number) => ({ amount, currency: "BDT" as const });
  const base: Parameters<typeof displayedOffer>[0] = {
    name: "Test Board",
    sku: "TB-1",
    price: money(16800),
    compareAtPrice: null,
    stockStatus: "in_stock",
    isPreOrder: false,
    isComingSoon: false,
    variantChoices: [] as ProductVariantChoice[],
    image: { src: "/uploads/products/a.webp", alt: "a" },
    images: [{ src: "/products/placeholder.svg", alt: "p" }],
  };
  const product = {
    brandName: "Volt",
    modelNumber: null,
    overview: ["Line one."],
    overviewHtml: "<p>Rich <b>overview</b></p>",
    discountEndsAt: null,
  } as Pick<ProductDetail, "brandName" | "modelNumber" | "overview" | "overviewHtml" | "discountEndsAt">;
  const build = (over: Partial<typeof base>, extra: Partial<typeof product> = {}) =>
    productJsonLd({ product: { ...product, ...extra }, offer: displayedOffer({ ...base, ...over }), path: "/product/t" }) as Json;

  const inStock = build({});
  const offer = inStock.offers as Json;
  check("in stock → offer with the page price", offer?.price === 16800 && offer.priceCurrency === "BDT");
  check("in stock → InStock", offer?.availability === "https://schema.org/InStock");
  check("itemCondition NewCondition", offer?.itemCondition === "https://schema.org/NewCondition");
  check("seller is the organization", (offer?.seller as Json)?.["@type"] === "Organization" && Boolean((offer?.seller as Json)?.name));
  check("images absolute, placeholder dropped", JSON.stringify(inStock.image) === JSON.stringify([absoluteUrl("/uploads/products/a.webp")]));
  check("description is plain text", inStock.description === "Rich overview");
  check("no aggregateRating/review key", !("aggregateRating" in inStock) && !("review" in inStock));
  check("price 0 → no offers", build({ price: money(0) }).offers === undefined);
  check("negative/NaN price → no offers", build({ price: money(Number.NaN) }).offers === undefined && !isPublishablePrice(money(-1)));
  check("out of stock (page hides price) → no offers", build({ stockStatus: "out_of_stock" }).offers === undefined);
  check("Up Coming → no offers", build({ isComingSoon: true }).offers === undefined);
  check("out of stock + Pre Order → PreOrder offer", (build({ stockStatus: "out_of_stock", isPreOrder: true }).offers as Json)?.availability === "https://schema.org/PreOrder");
  check("low stock → LimitedAvailability", (build({ stockStatus: "low_stock" }).offers as Json)?.availability === "https://schema.org/LimitedAvailability");
  check("only placeholder image → no image field", build({ image: { src: "/products/placeholder.svg", alt: "" }, images: [] }).image === undefined);

  // SEO phase 6: return / delivery terms only once /returns and /shipping are published.
  const withPolicies = (over: Partial<typeof base>, policies: { returnsPage: boolean; shippingPage: boolean; returnable: boolean }) =>
    productJsonLd({ product, offer: displayedOffer({ ...base, ...over }), path: "/product/t", policies }).offers as Json;
  {
    check("no policies → no shippingDetails / hasMerchantReturnPolicy", offer?.shippingDetails === undefined && offer?.hasMerchantReturnPolicy === undefined);
    const unpublished = withPolicies({}, { returnsPage: false, shippingPage: false, returnable: true });
    check("pages unpublished → no shippingDetails / hasMerchantReturnPolicy", unpublished.shippingDetails === undefined && unpublished.hasMerchantReturnPolicy === undefined);
    const live = withPolicies({}, { returnsPage: true, shippingPage: true, returnable: true });
    const policy = live.hasMerchantReturnPolicy as Json;
    check("return policy: BD, finite window", policy?.applicableCountry === "BD" && policy.returnPolicyCategory === "https://schema.org/MerchantReturnFiniteReturnWindow");
    check("return policy: merchantReturnDays = reportDeadOnArrivalDays", policy?.merchantReturnDays === POLICIES.reportDeadOnArrivalDays);
    check("return policy: by mail + in store", JSON.stringify(policy?.returnMethod) === JSON.stringify(["https://schema.org/ReturnByMail", "https://schema.org/ReturnInStore"]));
    check("return policy: no returnFees (conditional on whose error)", policy !== undefined && !("returnFees" in policy));
    const shipping = live.shippingDetails as Json;
    const time = shipping?.deliveryTime as Json | undefined;
    const range = (value: unknown) => `${(value as Json)?.minValue}-${(value as Json)?.maxValue}`;
    check("shipping: destination BD", ((shipping?.shippingDestination as Json)?.addressCountry) === "BD");
    check("shipping: handling 1-2 days", range(time?.handlingTime) === `${POLICIES.dispatchAfterConfirmationWorkingDays.min}-${POLICIES.dispatchAfterConfirmationWorkingDays.max}`);
    check("shipping: transit 1-7 days (both windows)", range(time?.transitTime) === "1-7");
    check("shipping: no shippingRate (zone/weight based)", shipping !== undefined && !("shippingRate" in shipping));
    const software = withPolicies({}, { returnsPage: true, shippingPage: true, returnable: false }).hasMerchantReturnPolicy as Json;
    check("software → MerchantReturnNotPermitted", software?.returnPolicyCategory === "https://schema.org/MerchantReturnNotPermitted" && !("merchantReturnDays" in software));
    const preOrder = withPolicies({ stockStatus: "out_of_stock", isPreOrder: true }, { returnsPage: true, shippingPage: true, returnable: true });
    check("pre-order → no shippingDetails", preOrder.shippingDetails === undefined && preOrder.hasMerchantReturnPolicy !== undefined);
  }
  const future = new Date(Date.now() + 5 * 86400000).toISOString();
  const sale = build({ compareAtPrice: money(20000) }, { discountEndsAt: future }).offers as Json;
  check("discount window → priceValidUntil", sale?.priceValidUntil === future.slice(0, 10));
  check("no discount → no priceValidUntil", (build({}, { discountEndsAt: future }).offers as Json)?.priceValidUntil === undefined);

  const variant = (id: string, amount: number, stockStatus: "in_stock" | "out_of_stock"): ProductVariantChoice => ({
    id, name: id, title: `Test ${id}`, key: id, values: [id], sku: `TB-${id}`, price: money(amount), compareAtPrice: null, stockStatus, image: null, images: [],
  });
  const variants = [variant("big", 30000, "in_stock"), variant("small", 20000, "in_stock"), variant("cheap", 10000, "out_of_stock")];
  const def = displayedOffer({ ...base, variantChoices: variants });
  check("default variant = cheapest IN-STOCK (same as the buy box)", def.variant?.id === "small" && def.price.amount === 20000 && def.sku === "TB-small");
  const linked = displayedOffer({ ...base, variantChoices: variants }, variants[0]!);
  check("?variant= link → that variant's price and title", linked.price.amount === 30000 && linked.name === "Test big");
}

// ---------------------------------------------------------------------------
// 2. Crawl
// ---------------------------------------------------------------------------

const SCHEMA_URL = /^https:\/\/schema\.org\/[A-Za-z]+$/;
const FORBIDDEN_KEYS = new Set(["aggregateRating", "review", "reviews", "reviewRating"]);

function findForbidden(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbidden(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      FORBIDDEN_KEYS.has(key) ? [`${path}.${key}`] : findForbidden(item, `${path}.${key}`),
    );
  }
  return [];
}

function isAbs(url: unknown): boolean {
  return typeof url === "string" && /^https?:\/\/[^/\s]+/.test(url);
}

function validateBlock(page: string, block: Json, html: string): void {
  const type = String(block["@type"]);
  const where = `${page} ${type}`;
  check(`${where}: @context`, block["@context"] === "https://schema.org");
  const forbidden = findForbidden(block);
  check(`${where}: no rating/review markup`, forbidden.length === 0, forbidden.join(", "));

  switch (type) {
    case "Organization": {
      check(`${where}: name`, Boolean(block.name));
      check(`${where}: url absolute`, isAbs(block.url));
      if (block.logo !== undefined) check(`${where}: logo absolute`, isAbs(block.logo));
      const points = (block.contactPoint as Json[] | undefined) ?? [];
      check(`${where}: contactPoint present`, points.length > 0);
      for (const point of points) {
        check(`${where}: contactPoint telephone +880`, /^\+880\d{10}$/.test(String(point.telephone)), String(point.telephone));
        check(`${where}: contactPoint contactType`, Boolean(point.contactType));
      }
      for (const link of (block.sameAs as string[] | undefined) ?? []) {
        check(`${where}: sameAs https`, /^https:\/\//.test(link), link);
      }
      break;
    }
    case "WebSite": {
      check(`${where}: url absolute`, isAbs(block.url));
      const action = block.potentialAction as Json | undefined;
      check(`${where}: SearchAction target`, String(action?.target ?? "").includes("{search_term_string}"));
      break;
    }
    case "ElectronicsStore": {
      const address = block.address as Json | undefined;
      check(`${where}: name`, Boolean(block.name));
      check(`${where}: url absolute`, isAbs(block.url));
      check(`${where}: address.streetAddress`, Boolean(address?.streetAddress));
      check(`${where}: address.addressCountry BD`, address?.addressCountry === "BD");
      check(`${where}: telephone +880`, /^\+880\d{10}$/.test(String(block.telephone)), String(block.telephone));
      checkStoreHoursAndGeo(where, block);
      check(`${where}: priceRange`, Boolean(block.priceRange));
      if (block.image !== undefined) check(`${where}: image absolute`, isAbs(block.image));
      if (block.hasMap !== undefined) check(`${where}: hasMap absolute`, isAbs(block.hasMap));
      break;
    }
    case "BreadcrumbList": {
      const items = (block.itemListElement as Json[] | undefined) ?? [];
      check(`${where}: has items`, items.length >= 2);
      items.forEach((item, index) => {
        check(`${where}: position ${index + 1}`, item.position === index + 1);
        check(`${where}: name ${index + 1}`, Boolean(item.name));
        if (index < items.length - 1) check(`${where}: item ${index + 1} absolute`, isAbs(item.item));
      });
      break;
    }
    case "ItemList": {
      const items = (block.itemListElement as Json[] | undefined) ?? [];
      check(`${where}: has items`, items.length > 0);
      check(`${where}: numberOfItems`, block.numberOfItems === items.length);
      items.forEach((item, index) => {
        if (index > 0) check(`${where}: positions consecutive`, Number(item.position) === Number(items[index - 1]!.position) + 1);
        check(`${where}: item url absolute product`, isAbs(item.url) && String(item.url).includes("/product/"));
        check(`${where}: item name`, Boolean(item.name));
      });
      break;
    }
    case "Product": {
      check(`${where}: name`, Boolean(block.name));
      check(`${where}: url absolute`, isAbs(block.url));
      check(`${where}: brand`, Boolean((block.brand as Json | undefined)?.name));
      check(`${where}: sku`, Boolean(block.sku));
      const images = (block.image as string[] | undefined) ?? [];
      for (const image of images) check(`${where}: image absolute`, isAbs(image), image);
      check(`${where}: no placeholder image`, !images.some((image) => image.includes("placeholder")));
      const offer = block.offers as Json | undefined;
      if (offer) {
        const price = Number(offer.price);
        check(`${where}: price > 0`, Number.isFinite(price) && price > 0, String(offer.price));
        check(`${where}: priceCurrency BDT`, offer.priceCurrency === "BDT");
        check(`${where}: availability`, SCHEMA_URL.test(String(offer.availability)));
        check(`${where}: itemCondition`, offer.itemCondition === "https://schema.org/NewCondition");
        check(`${where}: seller`, Boolean((offer.seller as Json | undefined)?.name));
        check(`${where}: offer url absolute`, isAbs(offer.url));
        if (offer.priceValidUntil !== undefined) {
          check(`${where}: priceValidUntil future date`, /^\d{4}-\d{2}-\d{2}$/.test(String(offer.priceValidUntil)) && String(offer.priceValidUntil) >= new Date().toISOString().slice(0, 10));
        }
        // The schema price must be a price the page itself shows.
        const shown = `৳ ${price.toLocaleString("en-US")}`;
        check(`${where}: schema price ${price} is shown on the page`, html.includes(shown) || html.includes(shown.replace(" ", "&nbsp;")) || html.includes(`৳ ${price.toLocaleString("en-US")}`));
      }
      // Present only once /returns and /shipping are published (SEO phase 6).
      const policy = offer?.hasMerchantReturnPolicy as Json | undefined;
      if (policy) {
        check(`${where}: return policy BD`, policy.applicableCountry === "BD");
        check(`${where}: return policy category`, SCHEMA_URL.test(String(policy.returnPolicyCategory)));
        if (policy.returnPolicyCategory === "https://schema.org/MerchantReturnFiniteReturnWindow") {
          check(`${where}: merchantReturnDays`, policy.merchantReturnDays === POLICIES.reportDeadOnArrivalDays);
        }
      }
      const shipping = offer?.shippingDetails as Json | undefined;
      if (shipping) {
        check(`${where}: shippingDetails BD`, (shipping.shippingDestination as Json | undefined)?.addressCountry === "BD");
        check(`${where}: no shippingRate`, !("shippingRate" in shipping));
      }
      break;
    }
    case "Article": {
      check(`${where}: headline`, Boolean(block.headline));
      check(`${where}: mainEntityOfPage absolute`, isAbs(block.mainEntityOfPage));
      check(`${where}: author`, Boolean((block.author as Json | undefined)?.name));
      for (const image of (block.image as string[] | undefined) ?? []) check(`${where}: image absolute`, isAbs(image), image);
      break;
    }
    case "FAQPage": {
      const items = (block.mainEntity as Json[] | undefined) ?? [];
      // Category/blog intros carry 3-5; the /faq page carries its full list.
      if (page === "/faq") check(`${where}: has questions`, items.length > 0);
      else check(`${where}: 3-5 questions`, items.length >= 3 && items.length <= 5, String(items.length));
      for (const item of items) {
        const answer = (item.acceptedAnswer as Json | undefined)?.text;
        check(`${where}: question + answer`, item["@type"] === "Question" && Boolean(item.name) && Boolean(answer));
        check(`${where}: no draft marker`, !String(item.name).includes("[VERIFY") && !String(answer).includes("[VERIFY") || process.env.CONTENT_PREVIEW === "1");
      }
      break;
    }
    default:
      break;
  }
}

async function crawl(base: string, productCount: number, dumpPath?: string): Promise<void> {
  const fetchText = async (path: string) => {
    const res = await fetch(`${base}${path}`, { headers: { "User-Agent": "Googlebot" }, redirect: "manual" });
    return { status: res.status, text: await res.text() };
  };
  const locs = async (name: string) =>
    [...(await fetchText(`/sitemap-${name}.xml`)).text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  const shuffle = <T,>(items: T[]) => items.map((item) => [Math.random(), item] as const).sort((a, b) => a[0] - b[0]).map(([, item]) => item);

  const [categories, brands, products, blogPosts] = await Promise.all([locs("categories"), locs("brands"), locs("products"), locs("blog")]);
  const pages = [
    "/", "/contact", "/about", "/shop", "/brands",
    ...shuffle(categories).slice(0, 8),
    ...shuffle(brands).slice(0, 3),
    ...blogPosts.slice(0, 5),
    ...shuffle(products).slice(0, productCount),
    ...(arg("paths")?.split(",").map((path) => path.trim()).filter(Boolean) ?? []),
  ];

  const dump: Record<string, unknown[]> = {};
  const stats = { pages: 0, blocks: 0, productsWithOffer: 0, productsWithoutOffer: 0 };
  for (const page of pages) {
    const { status, text } = await fetchText(page);
    check(`${page}: 200`, status === 200, String(status));
    if (status !== 200) continue;
    stats.pages += 1;
    const blocks: Json[] = [];
    for (const match of text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try {
        blocks.push(JSON.parse(match[1]!) as Json);
      } catch (error) {
        check(`${page}: JSON-LD parses`, false, String(error));
      }
    }
    stats.blocks += blocks.length;
    dump[page] = blocks;
    const types = blocks.map((block) => String(block["@type"]));
    const count = (type: string) => types.filter((value) => value === type).length;
    check(`${page}: exactly one Organization`, count("Organization") === 1, types.join(","));
    check(`${page}: exactly one WebSite`, count("WebSite") === 1, types.join(","));
    if (page === "/" || page === "/contact") check(`${page}: ElectronicsStore`, count("ElectronicsStore") === 1, types.join(","));
    else check(`${page}: no ElectronicsStore`, count("ElectronicsStore") === 0, types.join(","));
    if (page.startsWith("/product/")) {
      check(`${page}: Product + BreadcrumbList`, count("Product") === 1 && count("BreadcrumbList") === 1, types.join(","));
      const product = blocks.find((block) => block["@type"] === "Product");
      if (product?.offers) stats.productsWithOffer += 1;
      else stats.productsWithoutOffer += 1;
    }
    if (page.startsWith("/blog/")) {
      check(`${page}: Article + BreadcrumbList`, count("Article") === 1 && count("BreadcrumbList") === 1, types.join(","));
    }
    if (page.startsWith("/category/")) {
      check(`${page}: BreadcrumbList`, count("BreadcrumbList") === 1, types.join(","));
      // React splits "(176 Products found)" with <!-- --> markers.
      const visible = text.replace(/<!-- -->/g, "");
      const hasProducts = /\((?:[1-9]\d*) Products? found\)/.test(visible);
      check(`${page}: ItemList when the page lists products`, hasProducts ? count("ItemList") === 1 : count("ItemList") === 0, types.join(","));
    }
    for (const block of blocks) validateBlock(page, block, text);
  }
  console.log(
    `crawled ${stats.pages} pages, ${stats.blocks} JSON-LD blocks; products with offer: ${stats.productsWithOffer}, without (price hidden / invalid): ${stats.productsWithoutOffer}`,
  );
  if (dumpPath) {
    writeFileSync(dumpPath, JSON.stringify(dump, null, 2));
    console.log(`wrote every block to ${dumpPath}`);
  }
}

async function main(): Promise<void> {
  offline();
  if (!process.argv.includes("--offline")) {
    const base = (arg("base") ?? "http://127.0.0.1:3000").replace(/\/$/, "");
    try {
      await fetch(`${base}/robots.txt`);
    } catch {
      console.error(`cannot reach ${base} — start the app (next start) or pass --base=… (or --offline)`);
      process.exit(1);
    }
    await crawl(base, Number(arg("products") ?? 25), arg("dump"));
  }
  for (const line of failureLines) console.error(line);
  console.log(failures === 0 ? `ok ${checks} schema checks` : `failed ${failures}/${checks} schema checks`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
