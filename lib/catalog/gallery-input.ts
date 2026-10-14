/**
 * Product gallery image input helpers (client-safe).
 *
 * The thumbnail (`ProductImage.isPrimary = true`) is one cover image and keeps
 * its own single-field handling in `product-input-server.ts`. Everything after
 * it — the gallery a shopper scrolls through on the product page — used to be
 * exactly one more image (`gallerySrc`), because the admin form only ever
 * exposed one extra upload box: any image a bulk import or a direct database
 * edit had added beyond that was invisible and unreachable in the admin form
 * (AD-370). This is the list version: any number of images, in the order
 * they are shown.
 */

export const PRODUCT_GALLERY_IMAGE_MAX = 10;

function normalizeGalleryImage(raw: string): string | null | undefined {
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

/**
 * `undefined` means "not submitted — leave this product's gallery untouched"
 * (the bulk CSV importer has no column for it); the single-product form always
 * sends a real array, including `[]` to clear the gallery down to just the
 * thumbnail. An empty slot (the admin added a box and never filled it) is
 * dropped silently rather than rejected.
 */
export function parseProductGalleryImages(
  raw: string[] | undefined,
):
  | { ok: true; value: string[] | undefined }
  | { ok: false; formError: string } {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }
  if (raw.length > PRODUCT_GALLERY_IMAGE_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_GALLERY_IMAGE_MAX} gallery images.`,
    };
  }
  const out: string[] = [];
  for (const item of raw) {
    const normalized = normalizeGalleryImage(item);
    if (normalized === undefined) {
      return {
        ok: false,
        formError:
          "Each gallery image must be a local public path (e.g. /uploads/…) or an http(s) image URL.",
      };
    }
    if (normalized) {
      out.push(normalized);
    }
  }
  return { ok: true, value: out };
}
