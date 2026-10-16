/**
 * Product page: Coming Soon flag, info chip row, Out Of Stock text, "View
 * More Info" jump-link, and a smaller button corner radius (AD-373); the
 * "first container" redesign, a merged meta-pill row and a repositioned
 * View More Info (AD-374); Pre Order as a second, mutually-exclusive
 * availability flag, price hidden for Up Coming/out-of-stock (not Pre
 * Order), and bigger meta pills (AD-375).
 *
 *   npm run test:product-coming-soon
 *
 * Covers the full chain for the admin flags (isComingSoon from AD-373,
 * isPreOrder from AD-375):
 *   schema -> ProductSummary/ProductDetail types -> toProductSummary()/
 *   toProductDetail() mappers -> SUMMARY_SELECT + DETAIL_SELECT (storefront
 *   + admin — isComingSoon/isPreOrder moved onto SUMMARY_SELECT in AD-375 so
 *   listing cards and the catalog filter can see them too, modelNumber stays
 *   DETAIL-only) -> ProductInputFields/ParsedProductInput ->
 *   product-input-server.ts parsing -> admin-products.ts persistence
 *   (update, create, clone) -> the admin form's state/UI (mutually-exclusive
 *   Coming soon / Pre Order toggles) -> ProductMediaBuy -> the product page
 *   -> ProductSummary UI (meta-pill row, price-hiding, the Up Coming single-
 *   button state, the Pre Order relabelled button, View More Info).
 * Also pins the button radius change in components/ui/button.tsx, and the
 * catalog grid card / AddToCartButton treatment of both flags.
 * Source guards only — no database, no network. The real render was checked
 * in headless Chrome when each of these was built (see AD-373/374/375 in
 * project-memory/TASKS.md).
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

/**
 * `marker`'s own brace-balanced function BODY, starting at `marker` (which
 * must end right at or before the parameter list's opening `(`) and ending at
 * the function's closing `}`. Needed instead of a loose `[\s\S]*?` regex,
 * which can "leak" past this function's own closing brace into a later
 * function that happens to contain the same field names (productData() and
 * the create-path object literal both write `modelNumber`/`isComingSoon`).
 */
function functionBody(text: string, marker: string): string {
  const start = text.indexOf(marker);
  if (start < 0) {
    return "";
  }
  const parenStart = text.indexOf("(", start);
  if (parenStart < 0) {
    return "";
  }
  let parenDepth = 0;
  let parenEnd = -1;
  for (let index = parenStart; index < text.length; index += 1) {
    if (text[index] === "(") {
      parenDepth += 1;
    } else if (text[index] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        parenEnd = index;
        break;
      }
    }
  }
  if (parenEnd < 0) {
    return "";
  }
  const braceStart = text.indexOf("{", parenEnd);
  if (braceStart < 0) {
    return "";
  }
  let depth = 0;
  for (let index = braceStart; index < text.length; index += 1) {
    if (text[index] === "{") {
      depth += 1;
    } else if (text[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return text.slice(start);
}

function main(): void {
  const schema = source("prisma/schema.prisma");
  const catalogTypes = source("lib/data/types/catalog.ts");
  const mappers = source("lib/data/prisma/mappers.ts");
  const storefrontRepo = source("lib/data/prisma/product-repository.ts");
  const adminProducts = source("lib/catalog/admin-products.ts");
  const productInput = source("lib/catalog/product-input.ts");
  const productInputServer = source("lib/catalog/product-input-server.ts");
  const bulkCsv = source("lib/catalog/bulk-csv.ts");
  const form = source("features/admin/products/admin-product-form.tsx");
  const sidebar = source(
    "features/admin/products/admin-product-form-sidebar.tsx",
  );
  const mediaBuy = source("features/product/product-media-buy.tsx");
  const page = source("app/(storefront)/product/[slug]/page.tsx");
  const summary = source("features/product/product-summary.tsx");
  const button = source("components/ui/button.tsx");
  const productCard = source("features/catalog/product-card.tsx");
  const addToCartButton = source("features/cart/add-to-cart-button.tsx");
  const similarSidebar = source("features/product/product-similar-sidebar.tsx");
  const compareBody = source("features/lists/compare-body.tsx");

  /**
   * One top-level `const NAME = {...} satisfies Prisma.ProductSelect;`
   * block's own text, bounded to its OWN closing brace — a loose
   * `[\s\S]*?` regex looking for two fields "inside SUMMARY_SELECT" can
   * silently match past its real close into a LATER block (CLONE_SELECT,
   * DETAIL_SELECT) that happens to declare the same two field names, which
   * would let a real regression in SUMMARY_SELECT itself through
   * unnoticed. Same class of bug fixed once already via `functionBody()`.
   */
  function namedSelectBlock(text: string, constName: string): string {
    const marker = `const ${constName} = {`;
    const start = text.indexOf(marker);
    if (start < 0) {
      return "";
    }
    const end = text.indexOf("} satisfies Prisma.ProductSelect;", start);
    return end < 0 ? "" : text.slice(start, end);
  }

  // --- schema ---------------------------------------------------------------------------
  check(
    "schema: Product has modelNumber (nullable, not unique) and isComingSoon (boolean, default false)",
    /modelNumber\s+String\?(?!\s*@unique)/.test(schema) &&
      /isComingSoon\s+Boolean\s+@default\(false\)/.test(schema),
  );

  // --- domain type + mapper ---------------------------------------------------------------
  check(
    "ProductDetail carries modelNumber and isComingSoon",
    catalogTypes.includes("modelNumber: string | null;") &&
      catalogTypes.includes("isComingSoon: boolean;"),
  );
  check(
    "ProductDetailRow declares both fields and toProductDetail() copies them through",
    mappers.includes("modelNumber: string | null;") &&
      mappers.includes("isComingSoon: boolean;") &&
      mappers.includes("modelNumber: row.modelNumber,") &&
      mappers.includes("isComingSoon: row.isComingSoon,"),
  );

  // --- both DETAIL_SELECTs (storefront read path + admin edit-form read path) -------------
  check(
    "the storefront product-repository selects modelNumber (detail-only) and isComingSoon (now on SUMMARY_SELECT, AD-374)",
    storefrontRepo.includes("modelNumber: true,") &&
      storefrontRepo.includes("isComingSoon: true,"),
  );
  check(
    "the admin DETAIL_SELECT selects modelNumber directly, and isComingSoon/isPreOrder via its ...SUMMARY_SELECT spread (AD-374 moved both onto SUMMARY_SELECT so listing cards/filters see them too)",
    namedSelectBlock(adminProducts, "DETAIL_SELECT").startsWith(
      "const DETAIL_SELECT = {\n  ...SUMMARY_SELECT,",
    ) &&
      namedSelectBlock(adminProducts, "DETAIL_SELECT").includes(
        "modelNumber: true,",
      ) &&
      namedSelectBlock(adminProducts, "SUMMARY_SELECT").includes(
        "isComingSoon: true,",
      ) &&
      namedSelectBlock(adminProducts, "SUMMARY_SELECT").includes(
        "isPreOrder: true,",
      ),
  );

  // --- input/parse types ------------------------------------------------------------------
  check(
    "PRODUCT_MODEL_NUMBER_MAX exists and both input types carry the new fields",
    productInput.includes("export const PRODUCT_MODEL_NUMBER_MAX") &&
      productInput.includes("isComingSoon: boolean;") &&
      productInput.includes("modelNumber?: string;") &&
      productInput.includes("modelNumber: string | null;"),
  );
  check(
    "the server parser trims/caps modelNumber and passes isComingSoon straight through",
    productInputServer.includes("input.modelNumber.trim()") &&
      productInputServer.includes(
        "trimmedModelNumber.length > PRODUCT_MODEL_NUMBER_MAX",
      ) &&
      productInputServer.includes("isComingSoon: input.isComingSoon,") &&
      productInputServer.includes("modelNumber,"),
  );
  check(
    "the bulk CSV importer's ProductInputFields builder supplies isComingSoon (now a required field)",
    bulkCsv.includes("isComingSoon: toBool(row.is_coming_soon)"),
  );

  // --- persistence: update, create, clone ---------------------------------------------------
  const productDataBody = functionBody(adminProducts, "function productData(");
  check(
    "productData() (the update path) writes both fields",
    productDataBody.includes("isComingSoon: parsed.isComingSoon,") &&
      productDataBody.includes("modelNumber: parsed.modelNumber,"),
  );
  const persistParsedBody = functionBody(adminProducts, "async function persistParsed(");
  check(
    "the create path's prisma.product.create data writes both fields",
    persistParsedBody.includes("created = await prisma.$transaction") &&
      persistParsedBody.indexOf("isComingSoon: parsed.isComingSoon,") >
        persistParsedBody.indexOf("created = await prisma.$transaction") &&
      persistParsedBody.indexOf("modelNumber: parsed.modelNumber,") >
        persistParsedBody.indexOf("created = await prisma.$transaction"),
  );
  check(
    "CLONE_SELECT reads both source columns and the clone carries modelNumber + isComingSoon forward",
    /const CLONE_SELECT = \{[\s\S]*?isComingSoon: true,[\s\S]*?modelNumber: true,[\s\S]*?\} satisfies Prisma\.ProductSelect;/.test(
      adminProducts,
    ) &&
      adminProducts.includes("isComingSoon: source.isComingSoon,") &&
      adminProducts.includes("modelNumber: source.modelNumber,"),
  );

  // --- admin form state + UI ----------------------------------------------------------------
  check(
    "the form seeds modelNumber/comingSoon state from the loaded product and submits both",
    form.includes("const [modelNumber, setModelNumber] = useState(") &&
      form.includes('product?.modelNumber ?? "",') &&
      form.includes("const [comingSoon, setComingSoon] = useState(") &&
      form.includes("product?.isComingSoon ?? false,") &&
      form.includes("isComingSoon: comingSoon,") &&
      form.includes("modelNumber,"),
  );
  check(
    'the form has a "Model number" input capped at PRODUCT_MODEL_NUMBER_MAX',
    form.includes('id="product-model-number"') &&
      form.includes("maxLength={PRODUCT_MODEL_NUMBER_MAX}"),
  );
  check(
    "the form threads comingSoon down to the sidebar through the mutual-exclusion wrapper (AD-375: Coming soon and Pre Order can't both be on)",
    form.includes("comingSoon={comingSoon}") &&
      form.includes("setComingSoon={handleSetComingSoon}") &&
      form.includes("function handleSetComingSoon(") &&
      form.includes("function handleSetPreOrder("),
  );
  check(
    'the sidebar renders a "Coming soon / Upcoming" toggle next to New badge / Today\'s deal',
    sidebar.includes("comingSoon: boolean;") &&
      sidebar.includes('label="Coming soon / Upcoming"') &&
      sidebar.includes("checked={props.comingSoon}"),
  );

  // --- storefront prop threading --------------------------------------------------------
  check(
    "ProductMediaBuy accepts and forwards modelNumber/isComingSoon to ProductSummary",
    mediaBuy.includes("modelNumber: string | null;") &&
      mediaBuy.includes("isComingSoon: boolean;") &&
      mediaBuy.includes("modelNumber={modelNumber}") &&
      mediaBuy.includes("isComingSoon={isComingSoon}"),
  );
  check(
    "the product page passes the product's modelNumber/isComingSoon to ProductMediaBuy",
    page.includes("modelNumber={product.modelNumber}") &&
      page.includes("isComingSoon={product.isComingSoon}"),
  );

  // --- ProductSummary UI: chip row, Out Of Stock, Coming Soon, View More Info -------------
  check(
    "the merged meta row shows a Stock pill plus Model / SKU / Brand (AD-374: pills via Badge, not grey boxes with a Stock label)",
    summary.includes('{unavailable ? "Out Of Stock" : STOCK_LABEL[stockStatus]}') &&
      summary.includes("Model:") &&
      summary.includes("SKU:") &&
      summary.includes("Brand:") &&
      summary.includes("{modelNumber ? ("),
  );
  check(
    "the Stock pill renders bold and danger-toned (Badge tone=\"sale\") when unavailable",
    /tone=\{\s*unavailable\s*\?\s*"sale"/.test(summary) &&
      summary.includes('className={unavailable ? "font-bold" : undefined}'),
  );
  check(
    "a View More Info control scrolls to the specifications section",
    summary.includes("View More Info") &&
      summary.includes('.querySelector(\'[data-product-section="specifications"]\')') &&
      summary.includes('behavior: "smooth", block: "start"'),
  );
  check(
    "View More Info sits after the Quick overview block and before the cart controls",
    summary.indexOf("Quick overview") < summary.indexOf("View More Info") &&
      summary.indexOf("View More Info") < summary.indexOf('id="product-qty"'),
  );
  check(
    'an "Up Coming" status label renders only when isComingSoon is true, directly above the purchase row (AD-375: renamed from "Coming Soon" to match the operator\'s reference)',
    summary.includes("{isComingSoon ? (") &&
      summary.includes("Up Coming") &&
      !summary.includes("Coming Soon") &&
      summary.indexOf("{isComingSoon ? (") <
        summary.indexOf('id="product-qty"') &&
      summary.indexOf("Quick overview") <
        summary.indexOf("{isComingSoon ? ("),
  );

  const metaRowStart = summary.indexOf(
    'className="mt-2.5 flex flex-wrap items-center gap-2.5"',
  );
  const metaRowEnd = summary.indexOf(
    'className="relative overflow-hidden rounded-xl border',
  );
  const metaRow =
    metaRowStart >= 0 && metaRowEnd > metaRowStart
      ? summary.slice(metaRowStart, metaRowEnd)
      : "";
  check(
    'the Stock/Model/SKU/Brand pills all use size="md" (AD-375: bigger, on request, than the size="sm" they were before)',
    metaRow !== "" &&
      (metaRow.match(/size="md"/g) ?? []).length >= 4 &&
      !metaRow.includes('size="sm"'),
  );

  // --- button radius ------------------------------------------------------------------------
  check(
    "buttonClassName() uses the smaller rounded-sm radius, not rounded-md",
    button.includes("rounded-sm font-medium") &&
      !button.includes("rounded-md font-medium"),
  );

  // ==========================================================================================
  // AD-375 — Pre Order (second, mutually-exclusive availability flag) + price hidden for
  // Up Coming/out-of-stock, shown for Pre Order; bigger meta pills; View More Info moved
  // below the Quick Overview content instead of into its header.
  // ==========================================================================================

  check(
    "schema: Product has isPreOrder (boolean, default false), alongside isComingSoon",
    /isPreOrder\s+Boolean\s+@default\(false\)/.test(schema),
  );
  check(
    "ProductSummary (not just ProductDetail) carries isComingSoon/isPreOrder — AD-375 widened scope so listing cards and the catalog filter see them too",
    catalogTypes.includes("isPreOrder: boolean;") &&
      /ProductSummary = \{[\s\S]*?isComingSoon: boolean;[\s\S]*?isPreOrder: boolean;[\s\S]*?\};/.test(
        catalogTypes,
      ),
  );
  check(
    "ProductListQuery carries the two Availability-filter fields",
    catalogTypes.includes("preOrderOnly?: boolean;") &&
      catalogTypes.includes("comingSoonOnly?: boolean;"),
  );
  check(
    "ProductSummaryRow declares both fields and toProductSummary() copies them through",
    mappers.includes("isPreOrder: boolean;") &&
      /function toProductSummary\([\s\S]*?isComingSoon: row\.isComingSoon,[\s\S]*?isPreOrder: row\.isPreOrder,[\s\S]*?\n\}/.test(
        mappers,
      ),
  );
  check(
    "both SUMMARY_SELECTs (storefront + admin) select isComingSoon and isPreOrder — bounded to SUMMARY_SELECT's own block, not a later one (the CLONE_SELECT/DETAIL_SELECT leak-past-the-closing-brace bug from AD-373)",
    namedSelectBlock(storefrontRepo, "SUMMARY_SELECT").includes(
      "isComingSoon: true,",
    ) &&
      namedSelectBlock(storefrontRepo, "SUMMARY_SELECT").includes(
        "isPreOrder: true,",
      ) &&
      namedSelectBlock(adminProducts, "SUMMARY_SELECT").includes(
        "isComingSoon: true,",
      ) &&
      namedSelectBlock(adminProducts, "SUMMARY_SELECT").includes(
        "isPreOrder: true,",
      ),
  );
  check(
    "composeWhere() gates preOrderOnly/comingSoonOnly the same way inStockOnly already does",
    /if \(query\.preOrderOnly\) \{\s*where\.isPreOrder = true;\s*\}/.test(
      storefrontRepo,
    ) &&
      /if \(query\.comingSoonOnly\) \{\s*where\.isComingSoon = true;\s*\}/.test(
        storefrontRepo,
      ),
  );
  check(
    "BOTH ProductInputFields and ParsedProductInput declare isPreOrder (two separate types, two separate lines), and the server parser/bulk CSV pass it through",
    (productInput.match(/isPreOrder: boolean;/g) ?? []).length >= 2 &&
      productInputServer.includes("isPreOrder: input.isPreOrder,") &&
      bulkCsv.includes("isPreOrder: toBool(row.is_pre_order)"),
  );
  check(
    "productData() and the create path persist isPreOrder, and CLONE_SELECT/the clone carry it forward",
    functionBody(adminProducts, "function productData(").includes(
      "isPreOrder: parsed.isPreOrder,",
    ) &&
      functionBody(adminProducts, "async function persistParsed(").includes(
        "isPreOrder: parsed.isPreOrder,",
      ) &&
      /const CLONE_SELECT = \{[\s\S]*?isPreOrder: true,[\s\S]*?\} satisfies Prisma\.ProductSelect;/.test(
        adminProducts,
      ) &&
      adminProducts.includes("isPreOrder: source.isPreOrder,"),
  );
  check(
    "the admin form has a Pre Order toggle next to Coming soon, wired to the form and submitted",
    form.includes("const [preOrder, setPreOrder] = useState(") &&
      form.includes("isPreOrder: preOrder,") &&
      form.includes("preOrder={preOrder}") &&
      form.includes("setPreOrder={handleSetPreOrder}") &&
      sidebar.includes('label="Pre Order"') &&
      sidebar.includes("checked={props.preOrder}"),
  );
  check(
    "the two toggles are actually mutually exclusive — turning one on turns the other off, not just two toggles that happen to sit near each other",
    functionBody(form, "function handleSetComingSoon(").includes(
      "setPreOrder(false);",
    ) &&
      functionBody(form, "function handleSetPreOrder(").includes(
        "setComingSoon(false);",
      ),
  );
  check(
    "ProductMediaBuy/the product page thread isPreOrder through to ProductSummary",
    mediaBuy.includes("isPreOrder: boolean;") &&
      mediaBuy.includes("isPreOrder={isPreOrder}") &&
      page.includes("isPreOrder={product.isPreOrder}"),
  );
  check(
    "ProductSummary hides the price for Up Coming or out-of-stock, but not for a pre-order item",
    summary.includes(
      "const priceHidden = isComingSoon || unavailable;",
    ) &&
      summary.includes(
        'const unavailable = stockStatus === "out_of_stock" && !isPreOrder;',
      ) &&
      summary.includes("{!priceHidden ? (") &&
      summary.includes("emiVisible =") &&
      /emiVisible =\s*\n\s*!priceHidden &&/.test(summary),
  );
  check(
    "Up Coming replaces the whole purchase row with one disabled button LABELLED \"Up Coming\"; Pre Order keeps the normal row and relabels Add to cart",
    summary.includes(
      "Matches the reference exactly: nothing but one disabled button",
    ) &&
      summary.includes("cursor-not-allowed") &&
      /cursor-not-allowed[\s\S]*?>\s*\n\s*Up Coming\s*\n\s*<\/button>/.test(
        summary,
      ) &&
      summary.includes(
        '? "Place Pre Order"\n                    : justAdded || inCart',
      ),
  );
  check(
    'View More Info sits AFTER the overview body, not in the "Quick Overview" header (AD-375 — the operator corrected AD-374\'s header placement)',
    summary.indexOf("Quick Overview") < summary.indexOf("dangerouslySetInnerHTML") &&
      summary.indexOf("dangerouslySetInnerHTML") < summary.indexOf("View More Info") &&
      !summary.includes("ArrowRight"),
  );
  check(
    "the catalog grid cards' priceHidden() actually implements the isComingSoon/out-of-stock-not-pre-order rule, not just a same-named stub",
    functionBody(productCard, "function priceHidden(").includes(
      "product.isComingSoon ||",
    ) &&
      functionBody(productCard, "function priceHidden(").includes(
        'product.stockStatus === "out_of_stock" && !product.isPreOrder',
      ),
  );
  check(
    "the catalog grid cards (both ProductCard and CatalogProductCard) hide price the same way and show the status text instead, and pass isComingSoon/isPreOrder to AddToCartButton",
    productCard.includes("function priceHidden(product: ProductSummary)") &&
      productCard.includes("function availabilityLabel(product: ProductSummary)") &&
      (productCard.match(/priceHidden\(product\)/g) ?? []).length >= 4 &&
      (productCard.match(/isComingSoon=\{product\.isComingSoon\}/g) ?? [])
        .length === 2 &&
      (productCard.match(/isPreOrder=\{product\.isPreOrder\}/g) ?? [])
        .length === 2,
  );
  check(
    "AddToCartButton bypasses the out-of-stock disable for a pre-order item and relabels for both states",
    addToCartButton.includes(
      "isComingSoon || (stockStatus === \"out_of_stock\" && !isPreOrder)",
    ) &&
      addToCartButton.includes('"Up Coming"') &&
      addToCartButton.includes('"Place Pre Order"'),
  );
  check(
    "the Similar Products sidebar card (a third, separate inline card — not ProductCard/CatalogProductCard) hides price and relabels its own button too",
    functionBody(similarSidebar, "function priceHidden(").includes(
      "product.isComingSoon ||",
    ) &&
      similarSidebar.includes('"Up Coming"') &&
      similarSidebar.includes('"Place Pre Order"'),
  );
  check(
    "the Compare page hides price and shows Up Coming/Pre Order in its own Availability row too",
    functionBody(compareBody, "function priceHidden(").includes(
      "product.isComingSoon ||",
    ) &&
      functionBody(compareBody, "function availabilityText(").includes(
        'return "Up Coming";',
      ) &&
      functionBody(compareBody, "function availabilityText(").includes(
        'return "Pre Order";',
      ),
  );

  console.log(
    failures === 0
      ? `\nproduct coming-soon ok — ${checks} checks passed`
      : `\nproduct coming-soon FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
