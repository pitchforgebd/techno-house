export type AdminSeoConfig = {
  title: string;
  description: string;
  keywords: string;
  updatedAt: string | null;
};

export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 320;
export const SEO_KEYWORD_MAX = 40;
export const SEO_KEYWORD_LIMIT = 24;

export const SITEMAP_PATH = "/sitemap.xml";
export const ROBOTS_PATH = "/robots.txt";

export const DEFAULT_SEO_TITLE = "Techno House";
export const DEFAULT_SEO_DESCRIPTION =
  "Technology products for work, study, and building a PC.";

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeSeoTitle(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SEO_TITLE_MAX) {
    return null;
  }
  return value;
}

export function normalizeSeoDescription(raw: string): string | null {
  const value = stripControlChars(raw);
  if (value.length > SEO_DESCRIPTION_MAX) {
    return null;
  }
  return value;
}

export function normalizeSeoKeywords(raw: string): string[] | null {
  const parts = raw
    .split(",")
    .map((part) => stripControlChars(part))
    .filter(Boolean);
  if (parts.length > SEO_KEYWORD_LIMIT) {
    return null;
  }
  if (parts.some((part) => part.length > SEO_KEYWORD_MAX)) {
    return null;
  }
  return [...new Set(parts)];
}

export function keywordsToInput(keywords: string[]): string {
  return keywords.join(", ");
}
