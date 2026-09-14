/**
 * Catalog listing layout suite.
 *
 *   npm run test:listing
 *
 * The category grid used to show 8 products — under two rows of a five-column
 * layout — so a category of 40 looked like a category of 8 and everything else
 * lived behind pagination. These checks pin the three things that fixed it:
 * a page size that fills the grid, a shopper-controlled page size, and the
 * listing card that actually carries the specs someone comparing products
 * needs.
 *
 * All of it is source and arithmetic, so the suite needs no database and no
 * running server.
 */
import { readFileSync } from "node:fs";
import {
  LISTING_PAGE_SIZE,
  LISTING_PAGE_SIZE_OPTIONS,
  parsePageSize,
} from "../../lib/catalog/listing-params";

let failures = 0;
let passes = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.error(`fail ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Columns at the widest breakpoint, read from the grid rather than assumed. */
function widestColumnCount(gridSource: string): number {
  const match = /xl:grid-cols-(\d+)/.exec(gridSource);
  return match ? Number(match[1]) : 0;
}

function main(): void {
  const gridSrc = readFileSync("features/catalog/product-grid.tsx", "utf-8");
  const bodySrc = readFileSync(
    "features/catalog/catalog-listing-body.tsx",
    "utf-8",
  );
  const controlSrc = readFileSync(
    "features/catalog/catalog-page-size-control.tsx",
    "utf-8",
  );

  // --- The page size has to fit the grid -----------------------------------
  const columns = widestColumnCount(gridSrc);
  check("the grid declares a column count at xl", columns > 0);
  check(
    `the default page size fills whole rows (${LISTING_PAGE_SIZE} / ${columns})`,
    columns > 0 && LISTING_PAGE_SIZE % columns === 0,
    "the last row would be ragged on a wide screen",
  );
  check(
    "the default is four rows",
    columns > 0 && LISTING_PAGE_SIZE / columns === 4,
    `got ${columns > 0 ? LISTING_PAGE_SIZE / columns : "?"} rows`,
  );
  for (const option of LISTING_PAGE_SIZE_OPTIONS) {
    check(
      `the ${option}-per-page option fills whole rows`,
      columns > 0 && option % columns === 0,
    );
  }
  check(
    "the default is one of the offered options",
    (LISTING_PAGE_SIZE_OPTIONS as readonly number[]).includes(
      LISTING_PAGE_SIZE,
    ),
    "the control would show a value the listing is not using",
  );

  // --- Page size comes from the URL, and is not open --------------------
  // It reaches `take` in a database query, so anything goes straight through
  // to Postgres unless it is restricted to the known options.
  for (const option of LISTING_PAGE_SIZE_OPTIONS) {
    check(`pageSize=${option} is accepted`, parsePageSize(String(option)) === option);
  }
  for (const bad of [
    "9999",
    "100000",
    "0",
    "-20",
    "21",
    "abc",
    "",
    undefined,
    "20; DROP TABLE",
  ]) {
    check(
      `pageSize=${JSON.stringify(bad)} falls back to the default`,
      parsePageSize(bad) === LISTING_PAGE_SIZE,
      `got ${parsePageSize(bad)} — an unbounded page size reaches the database`,
    );
  }
  check(
    "an array value takes the first entry rather than throwing",
    parsePageSize(["40", "9999"]) === 40,
  );

  // --- The control --------------------------------------------------------
  check(
    "the listing renders a page-size control",
    bodySrc.includes("<CatalogPageSizeControl"),
    "the shopper cannot choose to see more",
  );
  // Page size and page number are not independent: on page 3 of 20 you are
  // looking at products 41-60, and keeping page 3 at 100 per page lands on
  // 201-300 — an empty grid on most categories.
  check(
    "changing the page size returns to page one",
    /pageSize: Number\(event\.target\.value\)[\s\S]{0,200}page: 1/.test(
      controlSrc,
    ),
    "switching page size could land on an empty page",
  );
  check(
    "the choice lives in the URL, so it survives a refresh and is shareable",
    controlSrc.includes("listingHref(") && controlSrc.includes("router.push("),
  );
  check(
    "the control is labelled for screen readers",
    controlSrc.includes('aria-label="Products per page"'),
  );
  check(
    "the control sits beside the pagination, not inside it",
    /CatalogPageSizeControl[\s\S]{0,600}<Pagination/.test(bodySrc),
    "the two controls would not read as one decision",
  );
  // It must not disappear with the pagination: one page is exactly when a
  // shopper might want to go the other way and show fewer.
  check(
    "the page-size control renders even when there is only one page",
    /pageCount > 1 \? \([\s\S]{0,200}<Pagination/.test(bodySrc) &&
      !/pageCount > 1 \? \([\s\S]{0,200}<CatalogPageSizeControl/.test(bodySrc),
    "showing everything on one page would hide the way back",
  );

  // --- The listing card ---------------------------------------------------
  check(
    "the listing uses the detailed card",
    /card="detailed"/.test(bodySrc),
    "the listing would show the compact card, with no SKU or specs",
  );
  check(
    "the grid can still render the compact card",
    /card\?: "compact" \| "detailed"/.test(gridSrc),
    "related products and carousels would inherit the listing card",
  );
  const cardSrc = readFileSync("features/catalog/product-card.tsx", "utf-8");
  const detailed = cardSrc.slice(cardSrc.indexOf("export function CatalogProductCard"));
  check("the detailed card shows the SKU", detailed.includes("{product.sku}"));
  check(
    "the detailed card shows spec bullets",
    detailed.includes("specs.map("),
    "the comparison information would be missing",
  );
  check(
    "the detailed card has an add-to-cart action",
    detailed.includes("<AddToCartButton"),
  );
  // Twenty images a page instead of eight, so the sizes hint matters more than
  // it did: without it every card downloads a full-width image.
  check(
    "the detailed card gives next/image a sizes hint matching the grid",
    /sizes="\(min-width: 1280px\) 20vw/.test(detailed),
    "wide screens would download oversized images for every card",
  );

  // --- Badges, savings and hover actions on the detailed card -------------
  check(
    "the detailed card shows the discount corner flag",
    detailed.includes("<CornerFlag"),
    "a discounted product would look the same as a full-price one",
  );
  check(
    "a product that is both new and discounted keeps its NEW mark",
    /off != null && isNewBadgeWorthy\(product\)/.test(detailed),
    "the corner wedge holds the discount, so NEW needs its own pill",
  );
  check(
    "the detailed card shows admin label badges",
    detailed.includes("<AdminLabelBadge"),
  );
  check(
    "the detailed card uses the same savings wording as the compact card",
    detailed.includes("Save Extra ${formatMoney({ amount: saved })} on various offer"),
    "the two cards would describe the same discount differently",
  );
  // Savings used to replace the warranty line. A discounted product is
  // exactly the one where a buyer wants to see both.
  check(
    "savings and warranty are separate rows, not an either/or",
    detailed.includes("product.warrantyLabel") &&
      !/saved != null[\s\S]{0,400}\) : \([\s\S]{0,200}warrantyLabel/.test(detailed),
    "a discounted product would lose its warranty line",
  );

  check(
    "wishlist / compare / view are hover icons on the detailed card",
    detailed.includes("<ProductCardHoverActions"),
    "they would still be stacked buttons eating a third of the card",
  );
  check(
    "the stacked button row is gone from the detailed card",
    !detailed.includes("<ProductListActions"),
    "both the hover icons and the stacked buttons would render",
  );
  // The hover reveal is `group-hover`, so the card root must be the group.
  check(
    "the detailed card root establishes the hover group",
    /<article className="group /.test(detailed),
    "the hover icons would never appear",
  );
  // The icons are real <button>s. Inside the product <a> they would be
  // invalid markup and every wishlist click would navigate away.
  //
  // Checked structurally — the span between the image link's opening and
  // closing tags — rather than by how far apart the two appear. A distance
  // heuristic passes or fails on how many badges happen to sit between them,
  // which has nothing to do with the property being asserted.
  const imageLinkStart = detailed.indexOf('<Link href={href} className="block">');
  const imageLinkEnd = detailed.indexOf("</Link>", imageLinkStart);
  const insideImageLink =
    imageLinkStart === -1 ? "" : detailed.slice(imageLinkStart, imageLinkEnd);
  check(
    "the image link is present and closed",
    imageLinkStart !== -1 && imageLinkEnd > imageLinkStart,
  );
  check(
    "the hover actions sit outside the product link",
    !insideImageLink.includes("<ProductCardHoverActions"),
    "interactive controls nested in an anchor",
  );
  check(
    "the corner flag and badges also sit outside the link",
    !insideImageLink.includes("<CornerFlag") &&
      !insideImageLink.includes("<AdminLabelBadge"),
  );

  if (failures > 0) {
    console.error(`listing layout failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${passes} listing layout checks`);
}

main();
