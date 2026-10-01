/**
 * Category create/edit input helpers (P12-T01).
 * Safe to import from Client Components — no Prisma.
 */

export const CATEGORY_NAME_MAX = 120;
export const CATEGORY_SLUG_MAX = 80;
export const CATEGORY_DESCRIPTION_MAX = 500;
export const CATEGORY_POSITION_MAX = 99_999;
export const CATEGORY_FILTER_KEY_MAX = 24;
export const CATEGORY_EXTRA_BRAND_MAX = 40;

export function slugifyCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CATEGORY_SLUG_MAX);
}

export function parseFilterKeys(keywords: string, extra?: string): string[] {
  const parts = keywords
    .split(",")
    .map((part) => slugifyCategory(part))
    .filter((part) => part.length > 0);
  const extraKey = extra ? slugifyCategory(extra) : "";
  if (extraKey) {
    parts.push(extraKey);
  }
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const key of parts) {
    if (seen.has(key) || keys.length >= CATEGORY_FILTER_KEY_MAX) {
      continue;
    }
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

/**
 * Brand slugs to show for this category even without matching products yet
 * — admin-curated, comma-separated, same shape as `parseFilterKeys` but with
 * no companion dropdown field.
 */
export function parseExtraBrandSlugs(raw: string): string[] {
  const seen = new Set<string>();
  const slugs: string[] = [];
  for (const part of raw.split(",")) {
    const slug = slugifyCategory(part);
    if (!slug || seen.has(slug) || slugs.length >= CATEGORY_EXTRA_BRAND_MAX) {
      continue;
    }
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}

export function parseCategoryPosition(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (parsed > CATEGORY_POSITION_MAX) {
    return null;
  }
  return parsed;
}

export type CategoryInputFields = {
  name: string;
  slug: string;
  parentSlug: string;
  position: string;
  description: string;
  filterKeywords: string;
  filterAttr: string;
  /** Comma-separated brand slugs/names — see `parseExtraBrandSlugs`. */
  extraBrandSlugs: string;
  isActive: boolean;
  iconSrc?: string;
  bannerSrc?: string;
  coverSrc?: string;
  /**
   * Rich buying-guide copy rendered at the bottom of the category page.
   * Raw editor HTML — sanitized server-side on save (the allowlist lives in
   * `lib/content/sanitize-html.ts`, which pulls in Node-only code and so
   * cannot run in this client-safe module). Omit the key to leave whatever
   * is already stored untouched.
   */
  seoContentHtml?: string;
};

export type ParsedCategoryInput = {
  name: string;
  slug: string;
  parentSlug: string | null;
  position: number;
  description: string | null;
  filterKeys: string[];
  extraBrandSlugs: string[];
  isActive: boolean;
  iconSrc?: string | null;
  bannerSrc?: string | null;
  coverSrc?: string | null;
  /** Still unsanitized here — see `CategoryInputFields.seoContentHtml`. */
  seoContentHtml?: string;
};

const IMAGE_PATH_MAX = 240;

function normalizeImagePath(
  raw: string | undefined,
): string | null | false | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.length > IMAGE_PATH_MAX) {
    return false;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }
  if (value.includes("..") || /[<>"']/.test(value)) {
    return false;
  }
  return value;
}

export function parseCategoryInput(
  input: CategoryInputFields,
): { ok: true; value: ParsedCategoryInput } | { ok: false; formError: string } {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, formError: "Enter a category name." };
  }
  if (name.length > CATEGORY_NAME_MAX) {
    return { ok: false, formError: "Category name is too long." };
  }

  const slug = slugifyCategory(input.slug);
  if (!slug) {
    return { ok: false, formError: "Enter a URL slug." };
  }

  const position = parseCategoryPosition(input.position);
  if (position === null) {
    return {
      ok: false,
      formError: "Ordering number must be a whole number.",
    };
  }

  const description = input.description
    .trim()
    .slice(0, CATEGORY_DESCRIPTION_MAX);
  const parentSlug = slugifyCategory(input.parentSlug) || null;
  if (parentSlug === slug) {
    return { ok: false, formError: "A category cannot be its own parent." };
  }

  const iconSrc = normalizeImagePath(input.iconSrc);
  if (iconSrc === false) {
    return { ok: false, formError: "Icon path must be a local public path." };
  }
  const bannerSrc = normalizeImagePath(input.bannerSrc);
  if (bannerSrc === false) {
    return { ok: false, formError: "Banner path must be a local public path." };
  }
  const coverSrc = normalizeImagePath(input.coverSrc);
  if (coverSrc === false) {
    return { ok: false, formError: "Cover path must be a local public path." };
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      parentSlug,
      position,
      description: description.length > 0 ? description : null,
      filterKeys: parseFilterKeys(input.filterKeywords, input.filterAttr),
      extraBrandSlugs: parseExtraBrandSlugs(input.extraBrandSlugs),
      isActive: input.isActive,
      ...(iconSrc !== undefined ? { iconSrc } : {}),
      ...(bannerSrc !== undefined ? { bannerSrc } : {}),
      ...(coverSrc !== undefined ? { coverSrc } : {}),
      ...(input.seoContentHtml !== undefined
        ? { seoContentHtml: input.seoContentHtml }
        : {}),
    },
  };
}
