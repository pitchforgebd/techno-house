/**
 * Product page: Coming Soon flag, info chip row, Out Of Stock text, "View
 * More Info" jump-link, and a smaller button corner radius (AD-373).
 *
 *   npm run test:product-coming-soon
 *
 * Covers the full chain for the two new admin flags:
 *   schema -> ProductDetail type -> toProductDetail() mapper -> both
 *   DETAIL_SELECTs (storefront + admin) -> ProductInputFields/
 *   ParsedProductInput -> product-input-server.ts parsing ->
 *   admin-products.ts persistence (update, create, clone) -> the admin
 *   form's state/UI -> ProductMediaBuy -> the product page -> ProductSummary
 *   UI (chip row, Coming Soon label, View More Info link).
 * Also pins the button radius change in components/ui/button.tsx.
 * Source guards only — no database, no network. The real render (chip row,
 * Out of Stock styling, Coming Soon label, the jump-to-specifications click,
 * and the admin form fields) was checked in headless Chrome when this was
 * built (see AD-373 in project-memory/TASKS.md).
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
    "the storefront product-repository DETAIL_SELECT selects both new columns",
    storefrontRepo.includes("modelNumber: true,") &&
      storefrontRepo.includes("isComingSoon: true,"),
  );
  check(
    "the admin DETAIL_SELECT (separate from the storefront one) also selects both columns",
    /DETAIL_SELECT = \{[\s\S]*?modelNumber: true,[\s\S]*?isComingSoon: true,[\s\S]*?\} satisfies Prisma\.ProductSelect;/.test(
      adminProducts,
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
    "the form threads comingSoon/setComingSoon down to the sidebar",
    form.includes("comingSoon={comingSoon}") &&
      form.includes("setComingSoon={setComingSoon}"),
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
    "the info chip row shows Stock / Model / SKU / Brand",
    summary.includes("Stock:") &&
      summary.includes("Model:") &&
      summary.includes("SKU:") &&
      summary.includes("Brand:") &&
      summary.includes("{modelNumber ? ("),
  );
  check(
    "the Stock chip renders a bold, danger-coloured \"Out Of Stock\" when unavailable",
    summary.includes('unavailable ? "Out Of Stock" : STOCK_LABEL[stockStatus]') &&
      /unavailable \? "text-danger" : "text-text"/.test(summary),
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
    "a Coming Soon label renders only when isComingSoon is true, directly above the qty/cart row",
    summary.includes("{isComingSoon ? (") &&
      summary.includes("Coming Soon") &&
      summary.indexOf("{isComingSoon ? (") <
        summary.indexOf('id="product-qty"') &&
      summary.indexOf("Quick overview") <
        summary.indexOf("{isComingSoon ? ("),
  );

  // --- button radius ------------------------------------------------------------------------
  check(
    "buttonClassName() uses the smaller rounded-sm radius, not rounded-md",
    button.includes("rounded-sm font-medium") &&
      !button.includes("rounded-md font-medium"),
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
