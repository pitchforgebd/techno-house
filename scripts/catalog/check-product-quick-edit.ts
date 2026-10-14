/**
 * Admin product list -> "Quick edit" (AD-372): price, regular price, stock.
 *
 *   npm run test:product-quick-edit
 *
 * Before this, changing a product's price meant opening the full product
 * form; stock had its own "View stock" drawer already. This adds a "Quick
 * edit" entry to the row's own "..." menu, opening a small drawer with price,
 * regular price and the same two stock fields, saved in one atomic write.
 * This suite checks:
 *   - `parseQuickEditInput`, exercised directly — the same rule the full form
 *     uses for "regular price must beat price", reused rather than
 *     duplicated, plus a positive-price guard the full form's own flow
 *     doesn't need (a product being quick-edited already has a real price);
 *   - the persistence function updates price and stock atomically, in one
 *     transaction, and never silently turns Today's deal off;
 *   - the server action re-checks origin and the product.edit permission,
 *     the same gate every other product-write action uses;
 *   - the menu item exists and opens a drawer the table itself owns, the same
 *     architecture as the existing stock drawer, not a second ad-hoc pattern.
 * No database, no network — the real save was driven end to end in headless
 * Chrome when this was built (see AD-372 in project-memory/TASKS.md).
 */
import { readFileSync } from "node:fs";

import { parseQuickEditInput } from "../../lib/catalog/product-quick-edit";

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
 * the function's closing `}`. Finds the body's own `{` by first skipping past
 * the whole, paren-balanced parameter list — not just "the first `{`", which
 * an inline object-type parameter (`input: { ...fields... }`) would get
 * wrong, matching that type's own closing brace instead of the body's.
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

const BASE_FIELDS = { price: "1000", compareAt: "", quantity: "10", lowStockThreshold: "5" };

function pureRules(): void {
  const ok = parseQuickEditInput(BASE_FIELDS);
  check("a plain price with no regular price parses, with no sale", ok.ok && ok.value.priceAmount === 1000 && ok.value.compareAtAmount === null && !ok.value.marksAsSale);

  const withSale = parseQuickEditInput({ ...BASE_FIELDS, compareAt: "1500" });
  check("a regular price above the price is kept, and marks the edit as a sale", withSale.ok && withSale.value.compareAtAmount === 1500 && withSale.value.marksAsSale === true);

  const blank = parseQuickEditInput({ ...BASE_FIELDS, compareAt: "0" });
  check("a regular price of 0 is treated as 'no regular price', same as blank", blank.ok && blank.value.compareAtAmount === null);

  const tooLow = parseQuickEditInput({ ...BASE_FIELDS, compareAt: "900" });
  check("a regular price at or below the price is refused", !tooLow.ok);
  const equal = parseQuickEditInput({ ...BASE_FIELDS, compareAt: "1000" });
  check("a regular price exactly equal to the price is refused (must be a real markdown)", !equal.ok);

  const zeroPrice = parseQuickEditInput({ ...BASE_FIELDS, price: "0" });
  check("a price of 0 is refused (a real product keeps a real price)", !zeroPrice.ok);
  const negativePrice = parseQuickEditInput({ ...BASE_FIELDS, price: "-5" });
  check("a non-numeric/negative price is refused", !negativePrice.ok);

  const badQty = parseQuickEditInput({ ...BASE_FIELDS, quantity: "not a number" });
  check("stock fields reuse the real inventory parser (a bad quantity is refused)", !badQty.ok);

  const result = parseQuickEditInput({ price: "2500", compareAt: "3000", quantity: "7", lowStockThreshold: "2" });
  check(
    "every field round-trips correctly together",
    result.ok && result.value.priceAmount === 2500 && result.value.compareAtAmount === 3000 && result.value.quantity === 7 && result.value.lowStockThreshold === 2,
  );
}

function persistence(): void {
  const lib = source("lib/catalog/admin-products.ts");
  const fn = functionBody(lib, "export async function updateAdminProductQuickFields(");
  check("the function exists", fn.length > 0);
  check("it validates with the shared parser before touching the database", fn.includes("parseQuickEditInput(input.fields)") && fn.indexOf("parseQuickEditInput") < fn.indexOf("getPrisma()"));
  check("price and stock are written inside the same transaction (atomic)", fn.includes("$transaction(async (tx)") && fn.includes("upsertProductStock(\n        {") && fn.includes(",\n        tx,\n      );"));
  check(
    "a regular price above the price always turns the Sale/Today's-deal column on, and clearing it never turns it off",
    fn.includes("isSale: existing.isSale || parsed.value.marksAsSale,"),
  );
  check(
    "a failed stock write rolls back the whole transaction (via PersistRollback, not a partial save)",
    fn.includes("if (!stockResult.ok) {\n        throw new PersistRollback(stockResult);\n      }"),
  );
  check(
    "the edit is audited, unconditionally (not behind a dead branch)",
    fn.includes("\n\n  await recordProductAudit(\n    input.actor,\n    AUDIT_ACTIONS.PRODUCT_UPDATE,\n    existing,\n    {\n      quickEdit: {"),
  );
  check("a product that no longer exists is refused before any write", fn.includes('formError: "That product no longer exists."'));

  const actions = source("features/admin/products/product-actions.ts");
  const action = functionBody(actions, "export async function updateAdminProductQuickFieldsAction(");
  check("the server action checks same-origin and the product.edit permission, the same gate every other product write uses", action.includes("guardOrigin()") && action.includes('staffWithPermission("product.edit")'));
  check("the action forwards the actor (staff id, email, ip) for the audit log", action.includes("staffId: allowed.session.staffId") && action.includes("ip: meta.ip"));
}

function wiring(): void {
  const rowActions = source("features/admin/products/admin-product-row-actions.tsx");
  check("the row menu has a Quick edit item that closes the menu and calls the callback", rowActions.includes("Quick edit") && rowActions.includes("onQuickEdit();") && rowActions.includes("setOpen(false);\n              onQuickEdit();"));
  check("Quick edit sits as its own prop, not reusing the Edit link's href", rowActions.includes("onQuickEdit: () => void;") && !rowActions.includes('href={`/admin/products/${productId}`}>\n            <SlidersHorizontal'));

  const table = source("features/admin/products/admin-product-table.tsx");
  check("the table owns the quick-edit drawer's open state, the same pattern as the existing stock drawer", table.includes("const [quickEditProduct, setQuickEditProduct] =") && table.includes("const [stockProduct, setStockProduct] = useState"));
  check("the row action's callback opens the drawer for THAT row's product", table.includes("onQuickEdit={() => setQuickEditProduct(product)}"));
  check("the drawer is rendered once, closes back to null, and is keyed by product id (fresh state per product)", table.includes("<AdminProductQuickEditDrawer\n          key={quickEditProduct.id}") && table.includes("onClose={() => setQuickEditProduct(null)}"));

  const drawer = source("features/admin/products/admin-product-quick-edit-drawer.tsx");
  check("the drawer requires permission before offering a Save button (read-only for staff without product.edit)", drawer.includes("{canEdit ? (\n            <Button"));
  check("the drawer blocks a save attempt without permission even if the button somehow fires", drawer.includes("if (!canEdit) {\n      notifyError("));
  check("the drawer sends all four fields to the quick-edit action, not the full-product action", drawer.includes("updateAdminProductQuickFieldsAction({") && !drawer.includes("saveAdminProductAction"));
  check("a successful save refreshes the list so the new price/stock show immediately", drawer.includes("router.refresh();"));
}

function main(): void {
  pureRules();
  persistence();
  wiring();

  if (failures > 0) {
    console.error(`\nproduct quick edit: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`product quick edit ok — ${checks} checks`);
}

main();
