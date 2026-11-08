/**
 * Matching for the admin searchable select (AD-387). Pure, so the ranking can
 * be checked without a browser (`npm run test:category-search`).
 */

export type SearchableOption = {
  value: string;
  label: string;
  /** Secondary text, also searched — a category's parent path, for example. */
  hint?: string;
  /** Tree indent shown while the list is unfiltered. */
  depth?: number;
};

/** Lower-cased, accents stripped, every run of punctuation/space -> one space. */
export function normalizeSearchText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Options matching `query`, best first. Every word of the query must appear
 * somewhere in the label or hint, so a single letter or any keyword works.
 * Ranking: label starts with the query, then a label word starts with it,
 * then the label contains it, then only the hint matches; ties keep the
 * original (tree) order. An empty query returns the options unchanged.
 */
export function filterSearchableOptions<T extends SearchableOption>(
  options: readonly T[],
  query: string,
): T[] {
  const needle = normalizeSearchText(query);
  if (!needle) {
    return [...options];
  }
  const tokens = needle.split(" ");
  const ranked: { option: T; rank: number; index: number }[] = [];
  options.forEach((option, index) => {
    const label = normalizeSearchText(option.label);
    const haystack = `${label} ${normalizeSearchText(option.hint ?? "")}`;
    if (!tokens.every((token) => haystack.includes(token))) {
      return;
    }
    let rank = 3;
    if (label.startsWith(needle)) {
      rank = 0;
    } else if (` ${label}`.includes(` ${needle}`)) {
      rank = 1;
    } else if (label.includes(needle)) {
      rank = 2;
    }
    ranked.push({ option, rank, index });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.map((entry) => entry.option);
}

/**
 * Where the query first appears in `label`, for highlighting, or null. Works
 * on the raw label (case-insensitive) so the highlighted slice is exact.
 */
export function findMatchRange(
  label: string,
  query: string,
): { start: number; end: number } | null {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return null;
  }
  const start = label.toLowerCase().indexOf(needle);
  return start === -1 ? null : { start, end: start + needle.length };
}
