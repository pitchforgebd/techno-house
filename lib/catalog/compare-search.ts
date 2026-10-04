/**
 * Rules for the compare page's product picker (AD-358) — pure, shared by the
 * server action, the picker component and the test suite.
 *
 * The picker shows a starter list for the chosen product type and lets a
 * shopper search the WHOLE type — or, before any type is chosen, every product.
 * The starter list is one repository page (at most 48 products), so for a type
 * with hundreds of products most of them are only reachable by searching.
 */

/** Characters a shopper must type before the whole type is searched. */
export const COMPARE_SEARCH_MIN_CHARS = 3;

/** Most matches one search returns. */
export const COMPARE_SEARCH_MAX_RESULTS = 20;

/** Size of the starter list (the repository never returns more than 48 per page). */
export const COMPARE_LIST_SIZE = 48;

/** Longest search text and category slug an action accepts. */
export const COMPARE_QUERY_MAX = 80;
export const COMPARE_CATEGORY_MAX = 120;

export type CompareCandidate = {
  slug: string;
  name: string;
  sku: string;
  /**
   * The product's own category. With no type chosen on the page the first
   * product picked decides the category the comparison is locked to, exactly as
   * adding from a product card does.
   */
  categorySlug: string;
};

export type CompareCandidateList = {
  items: CompareCandidate[];
  /** Products in the whole type, so the picker can say "showing 48 of 290". */
  total: number;
};

/** Trims and caps untrusted search text. */
export function normalizeCompareQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, COMPARE_QUERY_MAX) : "";
}

/** Trims and caps an untrusted category slug. */
export function normalizeCompareCategory(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, COMPARE_CATEGORY_MAX) : "";
}

/**
 * What the picker shows for the text typed so far:
 * - "list"   nothing typed: the starter list;
 * - "local"  1–2 characters: the starter list filtered in the browser;
 * - "remote" 3 or more: the whole type (or every product when no type is
 *   chosen), searched on the server.
 */
export type PickerMode = "list" | "local" | "remote";

/** True when the text has enough letters to search the whole type (spaces do not count). */
export function isSearchableText(text: string): boolean {
  return text.replace(/\s+/g, "").length >= COMPARE_SEARCH_MIN_CHARS;
}

export function pickerMode(text: string): PickerMode {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return "list";
  }
  return isSearchableText(trimmed) ? "remote" : "local";
}

/** Keeps candidates containing every typed word in the name or SKU, minus those already picked. */
export function filterCandidates(
  items: readonly CompareCandidate[],
  text: string,
  excluded: ReadonlySet<string>,
): CompareCandidate[] {
  const words = text
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return items.filter((item) => {
    if (excluded.has(item.slug)) {
      return false;
    }
    const haystack = `${item.name} ${item.sku}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/**
 * Next highlighted option for a key press. `index` is -1 when nothing is
 * highlighted yet. Arrow keys stop at the ends instead of wrapping, so a held
 * key never silently jumps from the last product back to the first.
 */
export function nextActiveIndex(
  index: number,
  count: number,
  key: "ArrowDown" | "ArrowUp" | "Home" | "End",
): number {
  if (count <= 0) {
    return -1;
  }
  switch (key) {
    case "ArrowDown":
      return Math.min(index + 1, count - 1);
    case "ArrowUp":
      return index <= 0 ? 0 : index - 1;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
}
