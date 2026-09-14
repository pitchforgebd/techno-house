export const SEARCH_QUERY_MAX_LENGTH = 120;

export function normalizeSearchNeedle(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export function parseSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return normalizeSearchNeedle(value);
}
