/**
 * Product page layout contract (AD-360).
 *
 *   npm run test:product-layout
 *
 * The product page used to leave a tall empty block under the gallery whenever
 * the buy box was longer than the media column and the product had no labels,
 * warranty or notes. The cure is structural, so these checks pin the structure
 * (and the single-column reading order on small screens) as source guards. The
 * real rendering was checked in headless Chrome when the change was made — see
 * AD-360 in project-memory/TASKS.md. No database, no network.
 */
import { readFileSync } from "node:fs";

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
  const page = source("app/(storefront)/product/[slug]/page.tsx");
  const banner = source("features/product/product-page-banner.tsx");

  // --- one grid, two independent columns ---------------------------------------------
  check(
    "one grid holds both columns, with a flexible last row",
    media.includes("lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]") &&
      media.includes("lg:grid-rows-[auto_auto_1fr]"),
  );
  check(
    "the right column spans every row, so the buy box never sets the height of a left row",
    media.includes("lg:col-start-2") &&
      media.includes("lg:row-span-3") &&
      media.includes("lg:row-start-1"),
  );
  check(
    "the columns are not top-aligned boxes that leave a gap (no items-start)",
    !media.includes("lg:items-start"),
  );
  check(
    "the details sit in the LEFT column under the gallery (and notes), in the flexible last row",
    media.includes("lg:col-start-1 lg:row-start-3") && media.includes("{detail}"),
  );
  check(
    "the right column holds the buy box, then the banner, then the similar-products rail",
    media.indexOf("<ProductSummary") > -1 &&
      media.indexOf("{banner}") > media.indexOf("<ProductSummary") &&
      media.indexOf("{similar}") > media.indexOf("{banner}"),
  );
  check(
    "the similar-products rail still follows the long column (sticky on large screens)",
    media.includes("lg:sticky lg:top-4") && media.indexOf("lg:sticky") < media.indexOf("{similar}"),
  );

  // --- nothing is reserved for empty content -------------------------------------------
  check(
    "the strip under the gallery renders only when there is something in it",
    media.includes("{belowGallery ? (") &&
      media.includes("{banner ? (") === false && // banner uses the inline form below
      media.includes("{banner ? <div"),
  );
  check(
    "the detail and similar slots are skipped when absent",
    media.includes("{detail ? (") && media.includes("{similar ? ("),
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
    page.includes("productPageBanner ? (") && page.includes("<ProductPageBanner banner={productPageBanner} />"),
  );

  // --- single-column reading order below `lg` ------------------------------------------
  check(
    "below lg the right column dissolves, so each part takes its own place in one column",
    media.includes('className="contents lg:col-start-2') && media.includes("lg:block"),
  );
  const orderOf = (marker: string): number | null => {
    const at = media.indexOf(marker);
    if (at < 0) return null;
    // The order class sits on the wrapper just BEFORE the marker: take the last one.
    const found = [...media.slice(Math.max(0, at - 160), at).matchAll(/order-(\d)/g)];
    const last = found[found.length - 1];
    return last ? Number(last[1]) : null;
  };
  const gallery = orderOf("<ProductGallery");
  const notes = orderOf("{belowGallery}");
  const summary = orderOf("<ProductSummary");
  const bannerOrder = orderOf("{banner}");
  const detail = orderOf("{detail}");
  const similar = orderOf("{similar}");
  check(
    "small-screen order is gallery, notes, buy box, banner, details, similar products",
    gallery === 1 && notes === 2 && summary === 3 && bannerOrder === 4 && detail === 5 && similar === 6,
  );

  // --- the page no longer lays the sections out itself ---------------------------------
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
    "the banner image is sized for a half-width column",
    banner.includes('sizes="(min-width: 1024px) 50vw, 100vw"'),
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
