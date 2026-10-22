/**
 * Admin-configurable section order for the Add/Edit Product form (AD-383).
 * Operator: give the 9 content sections a specific default sequence, and let
 * an admin drag-reorder any section (including the 5 not explicitly named)
 * without a code change.
 */

export type ProductFormSectionId =
  | "basic_info"
  | "configuration"
  | "b2b_pricing"
  | "files_media"
  | "quick_overview"
  | "specifications"
  | "details"
  | "pc_builder"
  | "seo"
  | "price_stock"
  | "variants"
  | "labels"
  | "notes"
  | "promotions";

export type ProductFormSectionMeta = {
  id: ProductFormSectionId;
  label: string;
};

/**
 * Default order. The first 9 are the operator-specified sequence; the
 * remaining ones (not named in that request) keep their prior relative
 * order, appended after — the admin can drag any of them anywhere from the
 * layout settings page.
 */
export const PRODUCT_FORM_SECTIONS: readonly ProductFormSectionMeta[] = [
  { id: "basic_info", label: "Product basic information" },
  { id: "configuration", label: "Product configuration" },
  { id: "b2b_pricing", label: "B2B / Wholesale pricing" },
  { id: "files_media", label: "Files & media" },
  { id: "quick_overview", label: "Quick overview" },
  { id: "specifications", label: "Specifications" },
  { id: "details", label: "Details" },
  { id: "pc_builder", label: "PC Builder" },
  { id: "seo", label: "SEO meta tags" },
  { id: "price_stock", label: "Product price + stock" },
  { id: "variants", label: "Variants" },
  { id: "labels", label: "Labels" },
  { id: "notes", label: "Notes" },
  { id: "promotions", label: "Promotions" },
] as const;

export const DEFAULT_PRODUCT_FORM_ORDER: ProductFormSectionId[] =
  PRODUCT_FORM_SECTIONS.map((section) => section.id);

const SECTION_ID_SET = new Set<string>(DEFAULT_PRODUCT_FORM_ORDER);

export function isProductFormSectionId(
  value: string,
): value is ProductFormSectionId {
  return SECTION_ID_SET.has(value);
}

export function getProductFormSectionLabel(id: ProductFormSectionId): string {
  return (
    PRODUCT_FORM_SECTIONS.find((section) => section.id === id)?.label ?? id
  );
}

/**
 * Tolerant of a stale saved order: drops any id the form no longer has
 * (a section removed from code) and appends, at the end, any canonical id
 * missing from the input (a new section added later, or no saved order at
 * all yet) — so a future code change can never silently vanish a section
 * from the form just because an old order didn't know about it.
 */
export function normalizeProductFormOrder(
  raw: unknown,
): ProductFormSectionId[] {
  const seen = new Set<ProductFormSectionId>();
  const next: ProductFormSectionId[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        typeof item === "string" &&
        isProductFormSectionId(item) &&
        !seen.has(item)
      ) {
        seen.add(item);
        next.push(item);
      }
    }
  }
  for (const id of DEFAULT_PRODUCT_FORM_ORDER) {
    if (!seen.has(id)) {
      next.push(id);
    }
  }
  return next;
}
