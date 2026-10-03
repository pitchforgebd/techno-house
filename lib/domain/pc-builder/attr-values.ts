/**
 * Multi-value PC Builder attributes (AD-346).
 *
 * A single product can support more than one value for a compatibility
 * attribute — an Intel board that takes DDR4 *and* DDR5, a cooler that fits
 * AM4 + AM5 + LGA1700, a case that holds ATX and Micro-ATX boards, a board
 * with both NVMe and SATA. The existing `Product.builder*` text columns store
 * that as one comma-separated string ("DDR4, DDR5"), so no migration is needed
 * and every single value already in the database is still a valid one-item
 * list. Two parts are compatible when their lists share at least one value.
 *
 * Pure — no I/O — so the admin form, the server-side input parser and the
 * compatibility engine all agree on the exact same parsing.
 */

/** Hard cap on how many values one attribute may carry. */
export const ATTR_LIST_MAX_VALUES = 12;

const LIST_SPLIT = /[,;]+/;

/** Case/space/hyphen-insensitive identity: "Micro-ATX" ≡ "micro atx" ≡ "MicroATX". */
function matchKey(value: string): string {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Splits a stored/typed value into trimmed, de-duplicated values. When
 * `canonical` is given, a value that matches a vocabulary entry (ignoring
 * case, spaces and hyphens) is rewritten to that entry's exact spelling, so
 * "am5" and "AM5" can never drift apart.
 */
export function parseAttrList(
  raw: string | null | undefined,
  canonical?: readonly string[],
): string[] {
  if (!raw) {
    return [];
  }
  const canonicalByKey = new Map(
    (canonical ?? []).map((value) => [matchKey(value), value]),
  );
  const seen = new Set<string>();
  const values: string[] = [];
  for (const piece of raw.split(LIST_SPLIT)) {
    const trimmed = piece.trim();
    if (!trimmed) {
      continue;
    }
    const key = matchKey(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    values.push(canonicalByKey.get(key) ?? trimmed);
  }
  return values;
}

export function formatAttrList(values: readonly string[]): string {
  return values.join(", ");
}

/**
 * True when both lists are non-empty and share a value. An empty list on
 * either side is "unknown", not "no overlap" — callers must check emptiness
 * first (see `compareOverlapField` in compatibility.ts).
 */
export function attrListsOverlap(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const rightKeys = new Set(right.map(matchKey));
  return left.some((value) => rightKeys.has(matchKey(value)));
}

/** Toggles one vocabulary value in a stored string, keeping other values. */
export function toggleAttrValue(
  raw: string,
  value: string,
  canonical: readonly string[],
): string {
  const current = parseAttrList(raw, canonical);
  const key = matchKey(value);
  const next = current.some((item) => matchKey(item) === key)
    ? current.filter((item) => matchKey(item) !== key)
    : [...current, value];
  return formatAttrList(next);
}
