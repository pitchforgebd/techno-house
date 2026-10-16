/**
 * Category/shop left filter sidebar: a collapsible "Availability" group
 * (In Stock / Pre Order / Up Coming checkboxes) plus a collapse system for
 * every filter group, so a long filter list doesn't push the page into an
 * oversized scroll (AD-375).
 *
 *   npm run test:catalog-availability-filter
 *
 * Covers: `lib/catalog/listing-params.ts` (reserved param names, parsing,
 * `toListQueryFilters`, `listingHasActiveFilters`, URL building) ->
 * `lib/data/prisma/product-repository.ts`'s `composeWhere()` (the two new
 * independent AND branches, same convention as the existing `inStockOnly`) ->
 * `features/catalog/catalog-filters-form.tsx` (the collapsible `FilterGroup`
 * wrapper used by every group, the merged Availability fieldset reusing the
 * existing `stock` checkbox rather than duplicating it, and a capped/
 * scrollable facet value list).
 * Source guards only — no database, no network. The real render (collapse/
 * expand, checking a box narrows the grid, a long Brand list scrolls inside
 * its own box instead of stretching the sidebar) was checked in headless
 * Chrome when this was built (see AD-375 in project-memory/TASKS.md).
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
  const listingParams = source("lib/catalog/listing-params.ts");
  const storefrontRepo = source("lib/data/prisma/product-repository.ts");
  const filtersForm = source("features/catalog/catalog-filters-form.tsx");

  // --- lib/catalog/listing-params.ts ------------------------------------------------------
  check(
    "preOrder/comingSoon are reserved param names, alongside stock",
    /const RESERVED = new Set\(\[[\s\S]*?"stock",[\s\S]*?"preOrder",[\s\S]*?"comingSoon",[\s\S]*?\]\);/.test(
      listingParams,
    ),
  );
  check(
    "ParsedListingFilters carries preOrderOnly/comingSoonOnly",
    listingParams.includes("preOrderOnly: boolean;") &&
      listingParams.includes("comingSoonOnly: boolean;"),
  );
  check(
    "parseListingFilters() parses both the same way it already parses stock (1/true), and returns them",
    listingParams.includes(
      'const preOrderOnly = preOrderRaw === "1" || preOrderRaw === "true";',
    ) &&
      listingParams.includes(
        'const comingSoonOnly = comingSoonRaw === "1" || comingSoonRaw === "true";',
      ) &&
      /return \{\s*inStockOnly,\s*preOrderOnly,\s*comingSoonOnly,/.test(
        listingParams,
      ),
  );
  check(
    "toListQueryFilters() forwards both into the ProductListQuery pick",
    /Pick<\s*ProductListQuery,\s*\|\s*"inStockOnly"\s*\|\s*"preOrderOnly"\s*\|\s*"comingSoonOnly"/.test(
      listingParams,
    ) &&
      listingParams.includes("preOrderOnly: parsed.preOrderOnly || undefined,") &&
      listingParams.includes(
        "comingSoonOnly: parsed.comingSoonOnly || undefined,",
      ),
  );
  check(
    "listingHasActiveFilters() and buildListingSearchParams() both account for the two new flags",
    /listingHasActiveFilters[\s\S]*?parsed\.inStockOnly \|\|\s*\n\s*parsed\.preOrderOnly \|\|\s*\n\s*parsed\.comingSoonOnly \|\|/.test(
      listingParams,
    ) &&
      listingParams.includes('params.set("preOrder", "1");') &&
      listingParams.includes('params.set("comingSoon", "1");'),
  );

  // --- lib/data/prisma/product-repository.ts composeWhere() -------------------------------
  check(
    "composeWhere() gates isPreOrder/isComingSoon the same independent-AND way inStockOnly already works",
    /if \(query\.preOrderOnly\) \{\s*where\.isPreOrder = true;\s*\}/.test(
      storefrontRepo,
    ) &&
      /if \(query\.comingSoonOnly\) \{\s*where\.isComingSoon = true;\s*\}/.test(
        storefrontRepo,
      ),
  );

  // --- features/catalog/catalog-filters-form.tsx -------------------------------------------
  check(
    'a native <details>/<summary> FilterGroup gives every filter group a real collapse/expand (open by default, chevron rotates) — no new JS accordion state to wire up',
    filtersForm.includes("function FilterGroup(") &&
      filtersForm.includes("<details open") &&
      filtersForm.includes("<summary") &&
      filtersForm.includes("group-open:rotate-180"),
  );
  check(
    "Stock/Price/every facet all render through FilterGroup now, not a bare <fieldset>",
    filtersForm.includes('<FilterGroup title="Availability">') &&
      filtersForm.includes('<FilterGroup title="Price (৳)">') &&
      filtersForm.includes("<FilterGroup key={facet.key} title={facetLabel(facet.key)}>") &&
      !filtersForm.includes("<fieldset>"),
  );
  const availabilityGroupMatch = /<FilterGroup title="Availability">([\s\S]*?)<\/FilterGroup>/.exec(
    filtersForm,
  );
  const availabilityGroup = availabilityGroupMatch?.[1] ?? "";
  check(
    'the Availability group reuses the EXISTING name="stock" checkbox (not a duplicate/new one) plus two new ones, all three in one group',
    availabilityGroup !== "" &&
      availabilityGroup.includes('name="stock"') &&
      availabilityGroup.includes('name="preOrder"') &&
      availabilityGroup.includes('name="comingSoon"') &&
      availabilityGroup.includes("In Stock") &&
      availabilityGroup.includes("Pre Order") &&
      availabilityGroup.includes("Up Coming"),
  );
  check(
    "paramsFromParsed() (the optimistic-update comparison) also knows about preOrder/comingSoon, or the checkbox would flicker back on every click",
    /function paramsFromParsed[\s\S]*?parsed\.inStockOnly[\s\S]*?parsed\.preOrderOnly[\s\S]*?parsed\.comingSoonOnly[\s\S]*?\n\}/.test(
      filtersForm,
    ),
  );
  check(
    "a facet's value list is capped and internally scrollable instead of stretching the sidebar (the operator's 'niche scroll issue na hoy')",
    filtersForm.includes("max-h-56") && filtersForm.includes("overflow-y-auto"),
  );

  console.log(
    failures === 0
      ? `\ncatalog availability filter ok — ${checks} checks passed`
      : `\ncatalog availability filter FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
