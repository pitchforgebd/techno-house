export const SEARCH_QUERY_MAX_LENGTH = 120;

export function parseSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    return "";
  }
  return value.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}
