/**
 * Admin dashboard suite — shortcuts, trend filter, calculator.
 *
 *   npm run test:dashboard
 *
 * Three properties matter enough to pin:
 *
 *   1. The trend range is a closed set. It reaches the database as part of a
 *      bucket-plan query; an open string here is the same class of hole the
 *      catalog page-size control was — an unbounded value flowing into a
 *      query window.
 *   2. Report data (best-sellers, search terms) is gated behind the SAME
 *      permission as its full report page, and never even fetched for a
 *      staff member who lacks it — checked at the loader call site, not just
 *      the render, so a denied viewer's browser never receives the rows.
 *   3. The calculator never evaluates a string. Every button press is a
 *      plain-number state transition; there is no `eval`/`Function`
 *      construction anywhere in it to regress into existing.
 */
import { readFileSync } from "node:fs";
import { parseDashboardTrendRange } from "../../lib/admin/dashboard-trend";
import { canAccessAdminPath } from "../../lib/auth/admin-route-permissions";
import {
  apply,
  backspace,
  chooseOperator,
  equals,
  formatResult,
  INITIAL_STATE,
  inputDecimal,
  inputDigit,
  inputPercent,
  toggleSign,
  type CalcState,
} from "../../features/admin/dashboard/admin-calculator";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function main(): void {
  // --- Trend range: closed set, same discipline as pageSize -----------------
  for (const good of ["today", "week", "15days", "month"] as const) {
    check(`range=${good} is accepted`, parseDashboardTrendRange(good) === good);
  }
  for (const bad of [
    "all",
    "year",
    "9999days",
    "",
    "TODAY",
    "today ",
    "'; DROP TABLE",
    "__proto__",
  ]) {
    check(
      `range=${JSON.stringify(bad)} falls back to today`,
      parseDashboardTrendRange(bad) === "today",
      `got ${parseDashboardTrendRange(bad)} — an unrecognised range reaching the bucket-plan query`,
    );
  }

  // --- Permission gating: the mechanism itself ------------------------------
  // Verified against the ACTUAL route rules, not guessed permission strings —
  // a staff member with only `product.view` must see exactly the "Add
  // product" shortcut and no others, and must not be able to reach the two
  // report panels.
  const partial = ["dashboard.view", "product.view"];
  check(
    "product.view opens the product shortcut",
    canAccessAdminPath("/admin/products/new", partial),
  );
  for (const [href, label] of [
    ["/admin/coupons/new", "coupon"],
    ["/admin/customers/new", "customer"],
    ["/admin/orders", "orders"],
    ["/admin/reports", "reports"],
  ] as const) {
    check(
      `product.view alone does NOT open the ${label} shortcut`,
      !canAccessAdminPath(href, partial),
      "a shortcut would link to a page that immediately bounces the viewer to Forbidden",
    );
  }
  check(
    "product.view alone does NOT unlock the best-sellers panel",
    !canAccessAdminPath("/admin/reports/product-sales", partial),
    "report data would be fetched for a staff member who cannot see the full report",
  );
  check(
    "product.view alone does NOT unlock the search-terms panel",
    !canAccessAdminPath("/admin/reports/searches", partial),
  );
  check(
    "reports.product_sale unlocks only the matching panel",
    canAccessAdminPath("/admin/reports/product-sales", ["reports.product_sale"]) &&
      !canAccessAdminPath("/admin/reports/searches", ["reports.product_sale"]),
    "the two report gates are not actually independent",
  );
  check(
    "no permissions at all sees nothing",
    !canAccessAdminPath("/admin/products/new", []) &&
      !canAccessAdminPath("/admin", []),
  );

  // --- The page loader must gate the FETCH, not just the render ------------
  // Source-checked because minting a second, deliberately under-permissioned
  // staff fixture for a live probe is disproportionate to what this is
  // guarding; the property that matters is visible in one place.
  const pageSrc = readFileSync("app/(admin)/admin/(panel)/page.tsx", "utf-8");
  check(
    "product-sale rows are only queried when canViewProductSales is true",
    /canViewProductSales\s*\?\s*loadProductSaleRows/.test(pageSrc),
    "the report would be fetched from the database regardless of permission",
  );
  check(
    "search rows are only queried when canViewSearches is true",
    /canViewSearches\s*\?\s*loadUserSearches/.test(pageSrc),
  );
  check(
    "shortcuts are filtered by canAccessAdminPath before rendering",
    /SHORTCUT_CANDIDATES\.filter\(\(shortcut\) =>\s*\n\s*canAccessAdminPath/.test(
      pageSrc,
    ),
    "an inaccessible shortcut could still render",
  );

  // --- The dashboard component hides rather than empties -------------------
  const dashboardSrc = readFileSync("features/admin/admin-dashboard.tsx", "utf-8");
  check(
    "denied panels are omitted from the tree, not rendered empty",
    dashboardSrc.includes("bestSellers && topSearches") &&
      dashboardSrc.includes(": bestSellers ?") &&
      dashboardSrc.includes(": topSearches ?"),
    "a null-permission panel would still render a card with no rows",
  );

  // --- Calculator: no eval anywhere -----------------------------------------
  const calcSrc = readFileSync(
    "features/admin/dashboard/admin-calculator.tsx",
    "utf-8",
  );
  check(
    "the calculator contains no eval or Function-constructor evaluation",
    !/\beval\s*\(/.test(calcSrc) && !/new Function\s*\(/.test(calcSrc),
    "a calculator is exactly the feature where string-evaluation creeps in",
  );

  // --- Calculator engine: pure function correctness -------------------------
  check("1 + 1 = 2", apply(1, 1, "+") === 2);
  check("5 - 3 = 2", apply(5, 3, "-") === 2);
  check("4 × 6 = 24", apply(4, 6, "×") === 24);
  check("10 ÷ 4 = 2.5", apply(10, 4, "÷") === 2.5);
  check(
    "division by zero returns null, not Infinity",
    apply(10, 0, "÷") === null,
    "a NaN/Infinity leaking into the display is worse than refusing the operation",
  );

  // A full "5 + 3 =" sequence through the real reducers, not just `apply`.
  let state: CalcState = INITIAL_STATE;
  state = inputDigit(state, "5");
  check("typing 5 shows 5", state.display === "5");
  state = chooseOperator(state, "+");
  check("accumulator captured after +", state.accumulator === 5);
  state = inputDigit(state, "3");
  check(
    "digit after an operator starts fresh, not '53'",
    state.display === "3",
    `got ${state.display}`,
  );
  state = equals(state);
  check("5 + 3 = shows 8", state.display === "8", `got ${state.display}`);
  check(
    "equals clears the pending operator (no accidental repeat)",
    state.accumulator === null && state.pendingOperator === null,
  );

  // Operator immediately followed by a different operator swaps, does not
  // compute early — "5 + ×" is "5 ×", not "5+5" then ×.
  let swapState: CalcState = INITIAL_STATE;
  swapState = inputDigit(swapState, "5");
  swapState = chooseOperator(swapState, "+");
  swapState = chooseOperator(swapState, "×");
  check(
    "pressing a second operator swaps rather than computing early",
    swapState.pendingOperator === "×" && swapState.accumulator === 5,
    `got operator=${swapState.pendingOperator} accumulator=${swapState.accumulator}`,
  );

  // Percent: with a pending operator, "%" means percent OF the accumulator —
  // 500 + 10% = 550, the discount/service-charge convention, not a bare ÷100.
  let pctState: CalcState = INITIAL_STATE;
  pctState = inputDigit(pctState, "5");
  pctState = inputDigit(pctState, "0");
  pctState = inputDigit(pctState, "0");
  pctState = chooseOperator(pctState, "+");
  pctState = inputDigit(pctState, "1");
  pctState = inputDigit(pctState, "0");
  pctState = inputPercent(pctState);
  check(
    "10% of 500 (with a pending +) is 50, not 0.1",
    pctState.display === "50",
    `got ${pctState.display}`,
  );
  pctState = equals(pctState);
  check(
    "500 + (10% of 500) = 550",
    pctState.display === "550",
    `got ${pctState.display}`,
  );

  // Standalone percent (no pending operator) is a plain ÷100.
  let bare = inputDigit(INITIAL_STATE, "5");
  bare = inputPercent(bare);
  check("standalone 5% is 0.05", bare.display === "0.05", `got ${bare.display}`);

  // Backspace and decimal-guard edge cases.
  let bs = inputDigit(INITIAL_STATE, "1");
  bs = inputDigit(bs, "2");
  bs = backspace(bs);
  check("backspace on '12' leaves '1'", bs.display === "1");
  bs = backspace(bs);
  check("backspacing the last digit resets to 0, not empty", bs.display === "0");

  let dec = inputDecimal(INITIAL_STATE);
  dec = inputDigit(dec, "5");
  dec = inputDecimal(dec);
  check(
    "a second decimal point is ignored",
    dec.display === "0.5",
    `got ${dec.display}`,
  );

  let sign = inputDigit(INITIAL_STATE, "7");
  sign = toggleSign(sign);
  check("sign toggles 7 to -7", sign.display === "-7");
  sign = toggleSign(sign);
  check("sign toggles back to 7", sign.display === "7");

  // Divide by zero through the real reducer path, not just `apply` directly —
  // this is what actually runs when someone presses "5 ÷ 0 =".
  let dz: CalcState = INITIAL_STATE;
  dz = inputDigit(dz, "5");
  dz = chooseOperator(dz, "÷");
  dz = inputDigit(dz, "0");
  dz = equals(dz);
  check(
    "5 ÷ 0 = shows Error, not Infinity or NaN",
    dz.display === "Error",
    `got ${dz.display}`,
  );

  check("formatResult trims float noise (0.1 + 0.2)", formatResult(0.1 + 0.2) === "0.3");
  check("formatResult on NaN/Infinity is Error", formatResult(Infinity) === "Error");

  if (failures > 0) {
    console.error(`dashboard failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} dashboard checks`);
}

main();
