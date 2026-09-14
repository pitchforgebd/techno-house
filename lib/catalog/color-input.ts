/**
 * Product colour input helpers (client-safe).
 */

export const PRODUCT_COLOR_MAX = 12;
export const PRODUCT_COLOR_NAME_MAX = 40;
export const PRODUCT_COLOR_IMAGE_MAX = 6;

export type ProductColorInputFields = {
  name: string;
  hex: string;
  /** Local public paths or http(s) image URLs for this colour’s gallery. */
  images: string[];
};

export type ParsedProductColor = {
  name: string;
  hex: string | null;
  images: string[];
};

export function normalizeColorHex(
  raw: string,
): { ok: true; value: string | null } | { ok: false; formError: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash)) {
    return {
      ok: false,
      formError: "Color code must be #RGB or #RRGGBB (e.g. #1a1a1a).",
    };
  }
  return { ok: true, value: withHash.toLowerCase() };
}

function normalizeColorImage(
  raw: string,
): string | null | undefined {
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.includes("..") || value.includes("\\")) {
    return undefined;
  }
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value.slice(0, 240);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }
    if (!url.hostname) {
      return undefined;
    }
    return value.slice(0, 500);
  } catch {
    return undefined;
  }
}

export function parseProductColors(
  rows: ProductColorInputFields[],
):
  | { ok: true; value: ParsedProductColor[] }
  | { ok: false; formError: string } {
  if (rows.length > PRODUCT_COLOR_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_COLOR_MAX} colours.`,
    };
  }

  const out: ParsedProductColor[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const name = row.name.trim().slice(0, PRODUCT_COLOR_NAME_MAX);
    const hexRaw = row.hex.trim();
    const imageRaws = row.images ?? [];
    if (!name && !hexRaw && imageRaws.every((src) => !src.trim())) {
      continue;
    }
    if (!name) {
      return { ok: false, formError: "Each colour needs a name." };
    }
    const hex = normalizeColorHex(hexRaw);
    if (!hex.ok) {
      return hex;
    }
    if (imageRaws.length > PRODUCT_COLOR_IMAGE_MAX) {
      return {
        ok: false,
        formError: `Colour “${name}” can have at most ${PRODUCT_COLOR_IMAGE_MAX} images.`,
      };
    }
    const images: string[] = [];
    for (const raw of imageRaws) {
      const normalized = normalizeColorImage(raw);
      if (normalized === undefined) {
        return {
          ok: false,
          formError: `Colour “${name}” has an invalid image path or URL.`,
        };
      }
      if (normalized) {
        images.push(normalized);
      }
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return {
        ok: false,
        formError: `Colour “${name}” is listed more than once.`,
      };
    }
    seen.add(key);
    out.push({ name, hex: hex.value, images });
  }

  return { ok: true, value: out };
}
