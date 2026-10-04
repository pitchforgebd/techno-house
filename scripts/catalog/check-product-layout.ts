/**
 * Product page layout contract (AD-360, reworked in AD-361).
 *
 *   npm run test:product-layout
 *
 * The product page is laid out like a classic storefront page on one flat
 * 12-column grid: gallery | buy information | colour options on top, wide
 * specifications / details beside a narrow similar-products rail below. The
 * structure keeps three things true that a unit test cannot see — no tall empty
 * block under the gallery, the same single-column reading order on phones, and
 * nothing reserved for content that is not there — so these checks pin it as
 * source guards. The real rendering was checked in headless Chrome when the
 * layout was made (see AD-361 in project-memory/TASKS.md). No database, no network.
 */
import { existsSync, readFileSync } from "node:fs";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

/** Source text with Windows line endings normalised, so patterns can use a plain newline. */
function source(path: string): string {
  const crlf = String.fromCharCode(13, 10);
  const lf = String.fromCharCode(10);
  return readFileSync(path, "utf8").split(crlf).join(lf);
}

function main(): void {
  const media = source("features/product/product-media-buy.tsx");
  const summary = source("features/product/product-summary.tsx");
  const page = source("app/(storefront)/product/[slug]/page.tsx");
  const banner = source("features/product/product-page-banner.tsx");
  const cardsPath = "features/product/product-service-cards.tsx";

  // --- one flat 12-column grid ---------------------------------------------------------
  check(
    "one flat 12-column grid, with a flexible second row",
    media.includes("lg:grid-cols-12") && media.includes("lg:grid-rows-[auto_1fr_auto_auto]"),
  );
  check(
    "the gallery column is 5 wide and spans the first two rows",
    media.includes("lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1"),
  );
  check(
    "the buy information is 7 wide (lg) and 4 wide from xl when colour options take the rest",
    media.includes("lg:col-span-7 lg:col-start-6") && media.includes('hasOptions && "xl:col-span-4"'),
  );
  check(
    "the colour-options column is 3 wide, only from xl, in the top row",
    media.includes("xl:col-span-3 xl:col-start-10 xl:row-start-1"),
  );
  check(
    "the banner sits under the buy area, not under the gallery",
    media.includes("lg:col-span-7 lg:col-start-6 lg:row-start-2"),
  );
  check(
    "specifications / details are wide and the similar rail narrow, in the last row (one lower under a full-width banner)",
    media.includes("lg:col-span-8 lg:col-start-1 xl:col-span-9") &&
      media.includes("lg:col-span-4 lg:col-start-9") &&
      media.includes("xl:col-span-3 xl:col-start-10") &&
      // one row lower when a full-width banner sits between the top and the details:
      // BOTH the details and the similar rail must move, or one overlaps the banner
      media.split('bannerFull ? "lg:row-start-4" : "lg:row-start-3"').length - 1 === 2,
  );
  check(
    "the similar-products rail follows the long column (sticky on large screens)",
    media.includes("lg:sticky lg:top-4"),
  );
  check(
    "the columns are not top-aligned boxes (no items-start on the grid)",
    !media.includes("lg:items-start"),
  );

  // --- nothing reserved for content that is not there -----------------------------------
  check(
    "the strip under the gallery renders only when it has content",
    media.includes("{belowGallery ? <div") &&
      media.includes("{banner ? (") &&
      media.includes("{detail ? (") &&
      media.includes("{similar ? ("),
  );
  check(
    "the page passes nothing for the gallery strip when there are no labels, warranty or notes",
    page.includes("const hasBelowGallery =") &&
      page.includes("product.labels.length > 0") &&
      page.includes("Boolean(product.warrantyLabel)") &&
      page.includes("product.notes.length > 0") &&
      page.includes("hasBelowGallery ? (") &&
      page.includes(") : null\n        }\n        banner="),
  );
  check(
    "the page passes the banner only when one exists",
    page.includes("productPageBanner ? (") &&
      page.includes("<ProductPageBanner banner={productPageBanner} />"),
  );
  check(
    "the colour options column exists only when the product has colours",
    summary.includes("{colorVariations ? (") && summary.includes("xl:block"),
  );

  // --- where the delivery cards go keeps the columns level -------------------------------
  check(
    "delivery cards: under the colours when there are colours, in the buy box when there are notes under the gallery, otherwise under the gallery",
    media.includes('hasOptions\n    ? "options"') &&
      media.includes('hasNotes\n      ? "info"') &&
      media.includes('"gallery"'),
  );
  check(
    "each placement shows the cards exactly once per screen size",
    // gallery copy: lg+ (and xl:hidden when the options column has them)
    media.includes('serviceCardsAt === "options" && "xl:hidden"') &&
      media.includes('serviceCardsAt !== "info"') &&
      // buy-box copy: always for "info", below lg otherwise
      summary.includes('serviceCardsAt === "info"') &&
      summary.includes('"lg:hidden"') &&
      // options-column copy
      summary.includes('serviceCardsAt === "options" ? <ProductServiceCards />'),
  );
  check(
    "the delivery cards are their own component that adapts to its own width",
    existsSync(cardsPath) &&
      source(cardsPath).includes('"@container"') &&
      source(cardsPath).includes("@md:grid-cols-3"),
  );

  // --- single-column reading order below lg ------------------------------------------------
  const at = (haystack: string, marker: string) => haystack.indexOf(marker);
  check(
    "DOM order is gallery, buy information (with colours), banner, details, similar products",
    at(media, "<ProductGallery") > -1 &&
      at(media, "<ProductSummary") > at(media, "<ProductGallery") &&
      media.lastIndexOf("{banner}") > at(media, "<ProductSummary") &&
      at(media, "{detail}") > media.lastIndexOf("{banner}") &&
      at(media, "{similar}") > at(media, "{detail}"),
  );
  check(
    "below xl the colours stay in the buy box, before the cart controls",
    summary.includes('<div className="xl:hidden">{colorVariations}</div>') &&
      at(summary, "{colorVariations ? <div") < at(summary, 'id="product-qty"'),
  );
  check(
    "the buy controls (qty, add to cart) come BEFORE check-availability and the quick overview, so the cart button stays beside the image however long the overview is",
    at(summary, 'id="product-qty"') > -1 &&
      at(summary, 'id="product-qty"') < at(summary, "Check availability") &&
      at(summary, 'id="product-qty"') < at(summary, "Quick overview") &&
      // the price block is above the controls
      at(summary, "Special price") < at(summary, 'id="product-qty"'),
  );
  check(
    "the buy column is compact: a 2xl title, rating and product id on one row, a tight price block",
    summary.includes("text-xl font-semibold leading-snug tracking-tight text-text sm:text-2xl") &&
      summary.includes("mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1") &&
      summary.includes("px-4 py-2.5") &&
      summary.includes("space-y-4"),
  );

  check(
    "the banner spans both columns as a strip under them, except with notes, when it sits under the buy information; small screens always get it after the buy box",
    media.includes('hasNotes ? "info" : "full"') &&
      media.includes('bannerAt === "info"') &&
      media.includes("lg:col-span-7 lg:col-start-6 lg:row-start-2") &&
      media.includes("lg:col-span-12 lg:col-start-1 lg:row-start-3"),
  );
  check(
    "the page tells the grid whether notes are present",
    page.includes("hasNotes={product.notes.length > 0}"),
  );

  // --- the buy row fits a narrow column -------------------------------------------------------
  check(
    "the Compare label drops out of a narrow buy column but keeps its accessible name",
    summary.includes("hidden @[27rem]:inline") &&
      summary.includes('aria-label={onCompare ? "In compare" : "Compare"}') &&
      summary.includes("@container space-y-4"),
  );
  check(
    "the summary renders two sibling boxes (buy information, colour options) for the page grid",
    summary.includes("infoClassName") && summary.includes("optionsClassName"),
  );

  // --- the page no longer lays the sections out itself -----------------------------------------
  const uses = (tag: string) => (page.match(new RegExp(`<${tag}[ \\n/>]`, "g")) ?? []).length;
  check(
    "each section is rendered once, inside the shared grid",
    uses("ProductDetailSections") === 1 &&
      uses("ProductSimilarSidebar") === 1 &&
      uses("ProductPageBanner") === 1 &&
      uses("ProductMediaExtras") === 1 &&
      page.indexOf("detail={") > page.indexOf("<ProductMediaBuy") &&
      page.indexOf("similar={") > page.indexOf("detail={") &&
      page.indexOf("banner={") > page.indexOf("<ProductMediaBuy"),
  );
  check(
    "the old full-width detail row is gone",
    !page.includes("mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)]"),
  );
  check(
    "related products still follow the whole block, full width",
    page.indexOf("<ProductRelated") > page.indexOf("similar="),
  );
  check(
    "the banner image is sized for its 7-of-12 column",
    banner.includes('sizes="(min-width: 1024px) 58vw, 100vw"'),
  );

  console.log(
    failures === 0
      ? `\nproduct layout ok — ${checks} checks passed`
      : `\nproduct layout FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
