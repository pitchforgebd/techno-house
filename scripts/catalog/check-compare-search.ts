/**
 * Compare-page product picker suite (AD-358).
 *
 *   npm run test:compare-search
 *
 * Pure rules (when to search, filtering, keyboard), the word-based search in
 * the mock repository, and source-level guards for what a unit test cannot
 * reach without a database or a browser. No database, no network.
 */
import { readFileSync } from "node:fs";
import {
  COMPARE_CATEGORY_MAX,
  COMPARE_LIST_SIZE,
  COMPARE_QUERY_MAX,
  COMPARE_SEARCH_MAX_RESULTS,
  COMPARE_SEARCH_MIN_CHARS,
  filterCandidates,
  isSearchableText,
  nextActiveIndex,
  normalizeCompareCategory,
  normalizeCompareQuery,
  pickerMode,
  type CompareCandidate,
} from "@/lib/catalog/compare-search";
import { mockProducts } from "@/lib/data/mocks/catalog";
import { mockProductRepository } from "@/lib/data/mocks/product-repository";
import { escapeLikePattern, splitSearchWords } from "@/lib/search/query";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const items: CompareCandidate[] = [
  { slug: "a", name: "MSI MAG B650 TOMAHAWK WIFI", sku: "MSI-B650-TW", categorySlug: "motherboard" },
  { slug: "b", name: "Gigabyte B650M AORUS ELITE", sku: "GB-B650M-AE", categorySlug: "motherboard" },
  { slug: "c", name: "ASUS PRIME A520M-K", sku: "ASU-A520MK", categorySlug: "motherboard" },
];

async function main(): Promise<void> {
  // --- when the whole category is searched ---------------------------------------
  check("the minimum is three characters", COMPARE_SEARCH_MIN_CHARS === 3);
  check(
    "nothing typed shows the starter list",
    pickerMode("") === "list" && pickerMode("   ") === "list",
  );
  check(
    "one or two characters filter the list in the browser",
    pickerMode("a") === "local" && pickerMode("ab") === "local" && pickerMode(" ab ") === "local",
  );
  check(
    "three or more characters search the whole category",
    pickerMode("abc") === "remote" && pickerMode("msi b650") === "remote",
  );
  check(
    "spaces do not count as characters ('a b' is still only two)",
    pickerMode("a b") === "local" && !isSearchableText("a b") && isSearchableText("ab c"),
  );

  // --- untrusted input is trimmed and capped -----------------------------------------
  check(
    "search text is trimmed and capped; non-text becomes empty",
    normalizeCompareQuery("  msi  ") === "msi" &&
      normalizeCompareQuery("x".repeat(500)).length === COMPARE_QUERY_MAX &&
      normalizeCompareQuery(undefined) === "" &&
      normalizeCompareQuery({ a: 1 }) === "" &&
      normalizeCompareQuery(42) === "",
  );
  check(
    "a category slug is trimmed and capped; non-text becomes empty",
    normalizeCompareCategory(" motherboard ") === "motherboard" &&
      normalizeCompareCategory("c".repeat(500)).length === COMPARE_CATEGORY_MAX &&
      normalizeCompareCategory(null) === "",
  );
  check(
    "the starter list never asks for more than the repository returns (48)",
    COMPARE_LIST_SIZE <= 48 && COMPARE_SEARCH_MAX_RESULTS <= 48,
  );

  // --- filtering the starter list ------------------------------------------------------
  const none = new Set<string>();
  check("empty text keeps everything not already picked", filterCandidates(items, "", none).length === 3);
  check(
    "words match in any order, in the name or the SKU, ignoring case",
    filterCandidates(items, "b650 msi", none).map((i) => i.slug).join() === "a" &&
      filterCandidates(items, "aorus", none).map((i) => i.slug).join() === "b" &&
      filterCandidates(items, "asu-a520", none).map((i) => i.slug).join() === "c" &&
      filterCandidates(items, "TOMAHAWK", none).length === 1,
  );
  check(
    "every word must match",
    filterCandidates(items, "msi aorus", none).length === 0 &&
      filterCandidates(items, "b650", none).length === 2,
  );
  check(
    "a product already being compared is never offered",
    filterCandidates(items, "b650", new Set(["a"])).map((i) => i.slug).join() === "b" &&
      filterCandidates(items, "", new Set(["a", "b", "c"])).length === 0,
  );
  check("filtering does not change the list it is given", (() => {
    const copy = [...items];
    filterCandidates(copy, "msi", none);
    return copy.length === 3 && copy[0] === items[0];
  })());

  // --- keyboard ---------------------------------------------------------------------------
  check(
    "ArrowDown starts at the first option and stops at the last",
    nextActiveIndex(-1, 3, "ArrowDown") === 0 &&
      nextActiveIndex(1, 3, "ArrowDown") === 2 &&
      nextActiveIndex(2, 3, "ArrowDown") === 2,
  );
  check(
    "ArrowUp stops at the first option and never goes below zero",
    nextActiveIndex(2, 3, "ArrowUp") === 1 &&
      nextActiveIndex(0, 3, "ArrowUp") === 0 &&
      nextActiveIndex(-1, 3, "ArrowUp") === 0,
  );
  check(
    "Home / End jump to the ends; an empty list highlights nothing",
    nextActiveIndex(1, 5, "Home") === 0 &&
      nextActiveIndex(1, 5, "End") === 4 &&
      nextActiveIndex(-1, 0, "ArrowDown") === -1,
  );

  // --- word-based search in the repository (mock, same rules as Prisma) -----------------
  check(
    "words are split, trimmed and limited",
    splitSearchWords("  msi   b650 ").join("|") === "msi|b650" &&
      splitSearchWords("a b c d e f g").length === 5 &&
      splitSearchWords("").length === 0 &&
      splitSearchWords(undefined).length === 0,
  );
  const bs = String.fromCharCode(92);
  check(
    "LIKE wildcards (% _) and the escape character are escaped, plain text is not touched",
    escapeLikePattern("a%b_c" + bs + "d") === "a" + bs + "%b" + bs + "_c" + bs + bs + "d" &&
      escapeLikePattern("plain 123") === "plain 123" &&
      escapeLikePattern("%") === bs + "%",
  );
  const sample = mockProducts.find(
    (product) =>
      splitSearchWords(product.name).length >= 2 &&
      splitSearchWords(product.name).join(" ").toLowerCase() !==
        [...splitSearchWords(product.name)].reverse().join(" ").toLowerCase(),
  );
  check("the mock catalogue has a multi-word product to test with", Boolean(sample));
  if (sample) {
    const reversed = [...splitSearchWords(sample.name)].reverse().join(" ");
    const base = { categorySlug: sample.categorySlug, page: 1, pageSize: 48 };
    const phrase = await mockProductRepository.list({ ...base, q: reversed });
    const words = await mockProductRepository.list({ ...base, q: reversed, qWords: true });
    check(
      "phrase search (the default, used by the shop) does NOT match words in a different order",
      !phrase.items.some((item) => item.slug === sample.slug),
    );
    check(
      "word search finds the product from the same words in a different order",
      words.items.some((item) => item.slug === sample.slug),
    );
    const everywhere = await mockProductRepository.list({ q: reversed, qWords: true, page: 1, pageSize: 48 });
    check(
      "with no category the word search looks across every category",
      everywhere.items.some((item) => item.slug === sample.slug),
    );
    const miss = await mockProductRepository.list({ ...base, q: `${reversed} zzzzqqqq`, qWords: true });
    check("every word must match: an extra unmatched word finds nothing", miss.items.length === 0);
    const other = await mockProductRepository.list({
      categorySlug: "no-such-category",
      q: reversed,
      qWords: true,
      page: 1,
      pageSize: 48,
    });
    check("word search stays inside the chosen category", other.items.length === 0);
  }

  // --- the server action ------------------------------------------------------------------------
  const actions = source("features/lists/actions.ts");
  const searchFn = actions.slice(actions.indexOf("export async function searchCompareCandidates"));
  const loadFn = actions.slice(
    actions.indexOf("export async function loadCompareCandidates"),
    actions.indexOf("export async function searchCompareCandidates"),
  );
  check(
    "searching normalises the inputs and returns nothing for short text, before querying",
    searchFn.indexOf("normalizeCompareCategory") > -1 &&
      searchFn.indexOf("normalizeCompareQuery") > -1 &&
      searchFn.indexOf("isSearchableText") > -1 &&
      searchFn.indexOf("productRepository.list") > searchFn.indexOf("isSearchableText"),
  );
  check(
    "searching is word-based, scoped to the category when one is given, and capped",
    searchFn.includes("qWords: true") &&
      searchFn.includes("...(slug ? { categorySlug: slug } : {})") &&
      searchFn.includes("pageSize: COMPARE_SEARCH_MAX_RESULTS"),
  );
  check(
    "with no category the search covers every product, but a malformed category is refused",
    !searchFn.includes("!slug ||") &&
      searchFn.includes('typeof categorySlug !== "string"') &&
      searchFn.indexOf('typeof categorySlug !== "string"') < searchFn.indexOf("productRepository.list"),
  );
  check(
    "each candidate carries its own category (needed to lock the comparison when no type is chosen)",
    actions.includes("categorySlug: product.categorySlug"),
  );
  check(
    "the starter list is capped and reports the category total",
    loadFn.includes("pageSize: COMPARE_LIST_SIZE") &&
      loadFn.includes("total: result.total") &&
      loadFn.includes("normalizeCompareCategory"),
  );

  // --- repositories: word mode is opt-in and keeps the other filters ---------------------------------
  const prisma = source("lib/data/prisma/product-repository.ts");
  check(
    "the Prisma repository only uses word mode when asked, otherwise the phrase search is unchanged",
    prisma.includes("query.qWords ? splitSearchWords(query.q) : []") &&
      prisma.includes("where.OR = textMatches(needle)"),
  );
  check(
    "word mode escapes LIKE wildcards, so a typed % or _ matches itself and not every product",
    prisma.includes("textMatches(escapeLikePattern(word))") &&
      prisma.includes("where.OR = textMatches(needle)"),
  );
  check(
    "word mode adds to, and never overwrites, the attribute filters",
    prisma.includes("...(Array.isArray(where.AND) ? where.AND : [])"),
  );
  const optedIn = [
    "features/catalog/shop-listing.tsx",
    "features/catalog/search-listing.tsx",
    "features/catalog/category-listing.tsx",
    "lib/catalog/listing-params.ts",
  ].filter((file) => source(file).includes("qWords"));
  check("the shop, search and category pages do not opt in (their behaviour is unchanged)", optedIn.length === 0);

  // --- the picker on the page ---------------------------------------------------------------------------
  const body = source("features/lists/compare-body.tsx");
  check(
    "the compare page uses the searchable picker in both places, remounted per type",
    (body.match(/<CompareProductPicker/g) ?? []).length === 2 &&
      (body.match(/key=\{activeCategory\}/g) ?? []).length === 2,
  );
  check(
    "adding uses the chosen type, else the product's own category, never nothing",
    body.includes("activeCategory || item.categorySlug") &&
      body.includes("onSelect={handleAdd}") &&
      (body.match(/categoryNames=\{categoryNames\}/g) ?? []).length === 2,
  );
  check(
    "the plain product dropdowns are gone",
    !body.includes('id="compare-product-empty"\n              className') &&
      !body.includes("selectable"),
  );
  const picker = source("features/lists/compare-product-picker.tsx");
  check(
    "the picker is an accessible combobox with a listbox of options",
    picker.includes('role="combobox"') &&
      picker.includes('role="listbox"') &&
      picker.includes('role="option"') &&
      picker.includes("aria-activedescendant") &&
      picker.includes("aria-expanded") &&
      picker.includes('role="status"'),
  );
  check(
    "the picker is usable before any type is chosen: only an add in progress disables it",
    picker.includes("const disabled = busy;") &&
      !picker.includes("Select a type first") &&
      !picker.includes("!categorySlug ||") &&
      picker.includes('placeholder="Type Product Name"'),
  );
  check(
    "with no type chosen the results say which category each product is in",
    picker.includes("categoryNames.get(item.categorySlug)") &&
      picker.includes("or choose a product type above"),
  );
  check(
    "the picker waits for typing to pause and ignores stale answers",
    picker.includes("SEARCH_DELAY_MS") &&
      picker.includes("clearTimeout") &&
      picker.includes("cancelled"),
  );
  check(
    "the picker hands a chosen product to the page and clears itself",
    picker.includes("onSelect(item)") && picker.includes('setQuery("")'),
  );

  console.log(
    failures === 0
      ? `\ncompare search ok — ${checks} checks passed`
      : `\ncompare search FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
