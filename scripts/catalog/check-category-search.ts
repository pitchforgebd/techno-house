/**
 * Admin product form category search (AD-387).
 *
 *   npm run test:category-search
 *
 * Main category, Subcategory and Related categories on the product form are
 * searchable selects: a single letter or any keyword lists the matching
 * categories, best first. This pins `filterSearchableOptions` (the ranking
 * and matching) and that the form really uses the searchable control for all
 * three fields. No database, no network.
 */
import { readFileSync } from "node:fs";
import {
  filterSearchableOptions,
  findMatchRange,
  normalizeSearchText,
  type SearchableOption,
} from "../../lib/admin/searchable-options";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

const options: SearchableOption[] = [
  { value: "laptop", label: "Laptop" },
  { value: "gaming-laptop", label: "Gaming Laptop", hint: "Laptop" },
  { value: "monitor", label: "Monitor" },
  { value: "monitor-arm", label: "Monitor Arm", hint: "Monitor" },
  { value: "smart-watch", label: "Smart Watch", hint: "Gadget" },
  { value: "mouse", label: "Mouse", hint: "Accessories" },
  { value: "cafe", label: "Café Machines" },
];
const values = (query: string) =>
  filterSearchableOptions(options, query).map((option) => option.value);

check("empty query keeps every option in order", values("").join() === options.map((o) => o.value).join());
check("whitespace-only query is treated as empty", values("   ").length === options.length);
check("a single letter matches", values("m").includes("monitor") && values("m").includes("mouse"));
check("label prefix ranks first", values("m")[0] === "monitor");
check("word-start match beats a mid-word match", values("lap").indexOf("laptop") < values("lap").indexOf("gaming-laptop"));
check("case-insensitive", values("GAMING").join() === "gaming-laptop");
check("hint is searched (parent name finds children)", values("gadget").join() === "smart-watch");
check("label match outranks a hint-only match", values("laptop")[0] === "laptop" && values("laptop").includes("gaming-laptop"));
check("every query word must match, in any order", values("arm monitor").join() === "monitor-arm");
check("no match returns nothing", values("zzz").length === 0);
check("accents are ignored", values("cafe").join() === "cafe");
check("punctuation is ignored", values("smart-watch").join() === "smart-watch");
check("normalize collapses punctuation and case", normalizeSearchText("  Gaming_Laptop!! ") === "gaming laptop");
check("filtering does not mutate the input", options[0]!.value === "laptop" && options.length === 7);

const range = findMatchRange("Gaming Laptop", "lap");
check("match range points at the hit", range?.start === 7 && range.end === 10);
check("no range when the label lacks the query", findMatchRange("Monitor", "xyz") === null);

const form = readFileSync("features/admin/products/admin-product-form.tsx", "utf8").replace(/\r\n/g, "\n");
for (const id of ["product-category", "product-subcategory", "product-related-category"]) {
  check(`${id} uses the searchable select`, new RegExp(`<AdminSearchableSelect\\s+id="${id}"`).test(form));
}
check("no plain <Select> left for the category fields", !/<Select\s+id="product-(sub)?category"/.test(form));

const control = readFileSync("features/admin/products/admin-searchable-select.tsx", "utf8");
check("Enter in the search box never submits the form", /event\.key === "Enter"[\s\S]{0,200}preventDefault\(\)/.test(control));
check("the list is portalled (form cards clip overflow)", control.includes("createPortal("));

if (failures > 0) {
  console.error(`category search: ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`category search ok — ${checks} checks`);
