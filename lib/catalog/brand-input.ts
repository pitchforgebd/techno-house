/**
 * Brand create/edit input helpers (P12-T02).
 * Safe to import from Client Components — no Prisma.
 */

export const BRAND_NAME_MAX = 120;
export const BRAND_SLUG_MAX = 80;
export const BRAND_DESCRIPTION_MAX = 500;
export const BRAND_POSITION_MAX = 99_999;

export function slugifyBrand(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BRAND_SLUG_MAX);
}

export function parseBrandPosition(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (parsed > BRAND_POSITION_MAX) {
    return null;
  }
  return parsed;
}

export type BrandInputFields = {
  name: string;
  slug: string;
  position: string;
  description: string;
  isActive: boolean;
  /** Public path under `/uploads/...` or `/brands/...`; empty clears. */
  logoSrc?: string;
};

export type ParsedBrandInput = {
  name: string;
  slug: string;
  position: number;
  description: string | null;
  isActive: boolean;
  /** `undefined` = leave existing logo unchanged. */
  logoSrc?: string | null;
};

const LOGO_PATH_MAX = 240;

function normalizeLogoSrc(raw: string): string | null | false {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.length > LOGO_PATH_MAX) {
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

export function parseBrandInput(
  input: BrandInputFields,
): { ok: true; value: ParsedBrandInput } | { ok: false; formError: string } {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, formError: "Enter a brand name." };
  }
  if (name.length > BRAND_NAME_MAX) {
    return { ok: false, formError: "Brand name is too long." };
  }

  const slug = slugifyBrand(input.slug);
  if (!slug) {
    return { ok: false, formError: "Enter a URL slug." };
  }

  const position = parseBrandPosition(input.position);
  if (position === null) {
    return {
      ok: false,
      formError: "Ordering number must be a whole number.",
    };
  }

  const description = input.description.trim().slice(0, BRAND_DESCRIPTION_MAX);

  let logoSrc: string | null | undefined;
  if (input.logoSrc !== undefined) {
    const normalized = normalizeLogoSrc(input.logoSrc);
    if (normalized === false) {
      return { ok: false, formError: "Logo path must be a local public path." };
    }
    logoSrc = normalized;
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      position,
      description: description.length > 0 ? description : null,
      isActive: input.isActive,
      ...(logoSrc !== undefined ? { logoSrc } : {}),
    },
  };
}
