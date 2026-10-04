export const SEARCH_QUERY_MAX_LENGTH = 120;

export function normalizeSearchNeedle(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export function parseSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return normalizeSearchNeedle(value);
}

/** Most words a word-based search looks at; more are ignored. */
export const SEARCH_WORDS_MAX = 5;

/**
 * The words of a search text, for word-based matching (every word must match):
 * trimmed, blanks dropped, at most `SEARCH_WORDS_MAX` words of 60 characters.
 * Pure, so the Prisma and mock repositories split text identically.
 */
export function splitSearchWords(raw: string | null | undefined): string[] {
  return normalizeSearchNeedle(raw)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SEARCH_WORDS_MAX)
    .map((word) => word.slice(0, 60));
}

/**
 * Escapes the characters a SQL LIKE / ILIKE treats as wildcards (% _) and the
 * escape character itself, so a typed "50%" or "zt_" is matched literally.
 * Prisma's `contains` does not do this, so without it a lone % or _ matches
 * every product.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
