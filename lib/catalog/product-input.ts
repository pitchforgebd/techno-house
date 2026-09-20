/**
 * Product create/edit input helpers (P12-T04).
 * Safe to import from Client Components — no Prisma.
 *
 * The async, database-validating counterpart (`parseProductInput`, which
 * checks note/label/related-product ids against real rows) lives in
 * `product-input-server.ts` instead — keeping it out of this file is not
 * cosmetic: this file is imported directly by the client product form
 * (`admin-product-form.tsx`) for its constants/types, and pulling any
 * Prisma-touching import into that chain breaks the production build (the
 * bundler tries to ship `pg`/`tls`/Node built-ins to the browser). Phase 14
 * caught this the first time `npm run build` was actually run to completion.
 */

import type { BuilderAttrs, BuilderSlot } from "@/lib/data/types/catalog";
import type { StockStatus } from "@/lib/data/types/common";
import { isBuilderSlotId } from "@/lib/domain/pc-builder/selection";
import {
  ATTRIBUTE_KEY_MAX,
  ATTRIBUTE_VALUE_COUNT_MAX,
  ATTRIBUTE_VALUE_MAX,
} from "@/lib/catalog/attribute-input";
import {
  parseStockInt,
  STOCK_QUANTITY_MAX,
} from "@/lib/catalog/inventory-input";
import type {
  ParsedProductColor,
  ProductColorInputFields,
} from "@/lib/catalog/color-input";
import type { DiscountType } from "@/lib/catalog/discount-pricing";
import type {
  ParsedSpecGroup,
  SpecGroupInputFields,
} from "@/lib/catalog/spec-group-input";

export const PRODUCT_NAME_MAX = 200;
export const PRODUCT_SLUG_MAX = 80;
export const PRODUCT_SKU_MAX = 40;
export const PRODUCT_POSITION_MAX = 99_999;
export const PRODUCT_WEIGHT_GRAMS_MAX = 100_000;
const PRODUCT_WEIGHT_GRAMS_DEFAULT = 500;
export const PRODUCT_OVERVIEW_MAX = 8_000;
export const PRODUCT_OVERVIEW_PARAGRAPHS = 12;
/** Same cap as the other rich-text admin fields (category SEO content). */
export const PRODUCT_CONTENT_HTML_MAX = 60_000;
export const PRODUCT_VARIANT_MAX = 20;
export const PRODUCT_WARRANTY_MAX = 80;
export const BUILDER_ATTR_MAX = 40;
export const BUILDER_TDP_MAX = 5_000;
export const PRODUCT_ATTRIBUTE_MAX = ATTRIBUTE_VALUE_COUNT_MAX;
export const PRODUCT_BARCODE_MAX = 40;
export const PRODUCT_RELATED_MAX = 8;

export type ProductAttributeInputFields = {
  key: string;
  value: string;
};

export type ParsedProductAttribute = {
  key: string;
  value: string;
};

export function slugifyProduct(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_SLUG_MAX);
}

export function parseProductPosition(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (parsed > PRODUCT_POSITION_MAX) {
    return null;
  }
  return parsed;
}

/** Shipping weight in grams — feeds the weight-based zone rate (AD-254). */
export function parseProductWeightGrams(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return PRODUCT_WEIGHT_GRAMS_DEFAULT;
  }
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (parsed < 1 || parsed > PRODUCT_WEIGHT_GRAMS_MAX) {
    return null;
  }
  return parsed;
}

export function parseTaka(value: string, label: string): number | string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const whole = trimmed.replace(/\.0+$/, "");
  if (!/^\d+$/.test(whole)) {
    return `Enter a valid ${label} in whole taka.`;
  }
  const parsed = Number(whole);
  if (parsed > 99_999_999) {
    return `${label} is too large.`;
  }
  return parsed;
}

export function parseOverview(value: string): string[] | string {
  if (value.length > PRODUCT_OVERVIEW_MAX) {
    return "Product description is too long.";
  }
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, PRODUCT_OVERVIEW_PARAGRAPHS);
  return paragraphs;
}

export type ProductVariantInputFields = {
  name: string;
  sku: string;
  price: string;
  compareAt: string;
  isActive: boolean;
  quantity: string;
};

export type ParsedProductVariant = {
  name: string;
  sku: string;
  priceAmount: number;
  compareAtAmount: number | null;
  isActive: boolean;
  quantity: number;
};

export type ProductInputFields = {
  name: string;
  slug: string;
  sku: string;
  brandSlug: string;
  categorySlug: string;
  position: string;
  /** Shipping weight in grams. Blank keeps the schema default (500g). */
  weightGrams?: string;
  /** Special / selling price customers pay. */
  price: string;
  /** Regular / list price (struck through when higher than special). */
  compareAt: string;
  /** Optional quick-calc helper; ignored when empty/0. */
  discountValue?: string;
  discountType?: DiscountType;
  discountStartsAt: string;
  discountEndsAt: string;
  overview: string;
  /** Rich-text "Quick overview" (buy box) and "Details" tab — genuinely
   * separate from each other and from `specGroups`/`overview`. */
  overviewHtml?: string;
  detailsHtml?: string;
  quantity: string;
  lowStockThreshold: string;
  isActive: boolean;
  isNew: boolean;
  isSale: boolean;
  warrantyEnabled: boolean;
  warrantyLabel: string;
  noteIds?: string[];
  labelIds?: string[];
  /** Blank clears it. Nullable + unique in the schema. */
  barcode?: string;
  relatedProductIds?: string[];
  /**
   * Omitted (not `[]`) means "don't touch" — the bulk CSV importer has no
   * column for any of these four, and submitting `[]` on every row would
   * wipe whatever a product already had (variants, attributes/colors/specs
   * from the single-product form, or the regex-populated attribute values
   * from `populate-import-attributes.ts`) on every re-import. The single-
   * product form always sends a real array, including `[]` to actually
   * clear a section — see `saveAdminProduct`.
   */
  variants?: ProductVariantInputFields[];
  attributes?: ProductAttributeInputFields[];
  colors?: ProductColorInputFields[];
  specGroups?: SpecGroupInputFields[];
  builderSlot: string;
  builderSocket: string;
  builderRamType: string;
  builderFormFactor: string;
  builderTdpWatts: string;
  builderStorageInterface: string;
  youtubeUrl: string;
  pdfSpecificationSrc: string;
  thumbnailSrc?: string;
  gallerySrc?: string;
};

export type ParsedProductInput = {
  name: string;
  slug: string;
  sku: string;
  brandSlug: string;
  categorySlug: string;
  position: number;
  weightGrams: number;
  priceAmount: number;
  compareAtAmount: number | null;
  discountStartsAt: Date | null;
  discountEndsAt: Date | null;
  overview: string[];
  /** `null` = clear it. `undefined` = not submitted, leave untouched. */
  overviewHtml?: string | null;
  detailsHtml?: string | null;
  quantity: number;
  lowStockThreshold: number;
  stockStatus: StockStatus;
  isActive: boolean;
  isNew: boolean;
  isSale: boolean;
  warrantyLabel: string | null;
  noteIds: string[];
  labelIds: string[];
  barcode: string | null;
  relatedProductIds: string[];
  /** `undefined` = leave whatever this product already has untouched. */
  variants?: ParsedProductVariant[];
  attributes?: ParsedProductAttribute[];
  colors?: ParsedProductColor[];
  specGroups?: ParsedSpecGroup[];
  builderSlot: BuilderSlot | null;
  builderAttrs: BuilderAttrs | null;
  youtubeUrl: string | null;
  pdfSpecificationSrc: string | null;
  thumbnailSrc?: string | null;
  gallerySrc?: string | null;
};

export function normalizeSku(value: string): string {
  return value.trim().replace(/\s+/g, "-").slice(0, PRODUCT_SKU_MAX);
}

export function parseVariants(
  rows: ProductVariantInputFields[],
  productSku: string,
):
  | { ok: true; value: ParsedProductVariant[] }
  | { ok: false; formError: string } {
  if (rows.length > PRODUCT_VARIANT_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_VARIANT_MAX} variants.`,
    };
  }

  const variants: ParsedProductVariant[] = [];
  const seen = new Set<string>([productSku.toLowerCase()]);

  for (const row of rows) {
    const name = row.name.trim();
    const sku = normalizeSku(row.sku);
    const priceRaw = row.price.trim();
    const compareRaw = row.compareAt.trim();
    const quantityRaw = row.quantity.trim();
    if (!name && !sku && !priceRaw && !compareRaw && !quantityRaw) {
      continue;
    }
    if (!name) {
      return { ok: false, formError: "Each variant needs a name." };
    }
    if (name.length > PRODUCT_NAME_MAX) {
      return { ok: false, formError: "A variant name is too long." };
    }
    if (!sku) {
      return { ok: false, formError: "Each variant needs a SKU." };
    }
    if (seen.has(sku.toLowerCase())) {
      return { ok: false, formError: "Variant SKUs must be unique." };
    }
    seen.add(sku.toLowerCase());

    const price = parseTaka(row.price, "variant price");
    if (typeof price === "string") {
      return { ok: false, formError: price };
    }

    const compareParsed = parseTaka(row.compareAt, "variant compare-at price");
    if (typeof compareParsed === "string") {
      return { ok: false, formError: compareParsed };
    }
    const compareAtAmount =
      compareParsed > 0 && compareParsed > price ? compareParsed : null;

    const quantity = parseStockInt(
      row.quantity,
      "variant stock",
      STOCK_QUANTITY_MAX,
    );
    if (typeof quantity === "string") {
      return { ok: false, formError: quantity };
    }

    variants.push({
      name,
      sku,
      priceAmount: price,
      compareAtAmount,
      isActive: row.isActive,
      quantity,
    });
  }

  return { ok: true, value: variants };
}

export function parseProductAttributes(
  rows: ProductAttributeInputFields[],
):
  | { ok: true; value: ParsedProductAttribute[] }
  | { ok: false; formError: string } {
  if (rows.length > PRODUCT_ATTRIBUTE_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_ATTRIBUTE_MAX} attributes.`,
    };
  }

  const attributes: ParsedProductAttribute[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const key = row.key.trim().slice(0, ATTRIBUTE_KEY_MAX);
    const value = row.value.trim().slice(0, ATTRIBUTE_VALUE_MAX);
    if (!key && !value) {
      continue;
    }
    if (!key) {
      return { ok: false, formError: "Each attribute needs a key." };
    }
    if (!value) {
      return {
        ok: false,
        formError: `Choose a value for attribute “${key}”.`,
      };
    }
    const keyLower = key.toLowerCase();
    if (seen.has(keyLower)) {
      return {
        ok: false,
        formError: `Attribute “${key}” is listed more than once.`,
      };
    }
    seen.add(keyLower);
    attributes.push({ key, value });
  }

  return { ok: true, value: attributes };
}

export function parseOptionalAttr(
  value: string,
  label: string,
): { ok: true; value?: string } | { ok: false; formError: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true };
  }
  if (trimmed.length > BUILDER_ATTR_MAX) {
    return { ok: false, formError: `${label} is too long.` };
  }
  return { ok: true, value: trimmed };
}

export function parseBuilderFields(
  input: ProductInputFields,
):
  | { ok: true; slot: BuilderSlot | null; attrs: BuilderAttrs | null }
  | { ok: false; formError: string } {
  const slotRaw = input.builderSlot.trim();
  if (!slotRaw) {
    return { ok: true, slot: null, attrs: null };
  }
  if (!isBuilderSlotId(slotRaw)) {
    return { ok: false, formError: "Choose a valid PC Builder slot." };
  }

  const socket = parseOptionalAttr(input.builderSocket, "Socket");
  if (!socket.ok) {
    return socket;
  }
  const ramType = parseOptionalAttr(input.builderRamType, "RAM type");
  if (!ramType.ok) {
    return ramType;
  }
  const formFactor = parseOptionalAttr(input.builderFormFactor, "Form factor");
  if (!formFactor.ok) {
    return formFactor;
  }
  const storageInterface = parseOptionalAttr(
    input.builderStorageInterface,
    "Storage interface",
  );
  if (!storageInterface.ok) {
    return storageInterface;
  }

  const tdpRaw = input.builderTdpWatts.trim();
  let tdpWatts: number | undefined;
  if (tdpRaw) {
    if (!/^\d+$/.test(tdpRaw)) {
      return { ok: false, formError: "TDP / wattage must be a whole number." };
    }
    const parsed = Number(tdpRaw);
    if (parsed < 1 || parsed > BUILDER_TDP_MAX) {
      return {
        ok: false,
        formError: `TDP / wattage must be between 1 and ${BUILDER_TDP_MAX}.`,
      };
    }
    tdpWatts = parsed;
  }

  const attrs: BuilderAttrs = {};
  if (socket.value) {
    attrs.socket = socket.value;
  }
  if (ramType.value) {
    attrs.ramType = ramType.value;
  }
  if (formFactor.value) {
    attrs.formFactor = formFactor.value;
  }
  if (storageInterface.value) {
    attrs.storageInterface = storageInterface.value;
  }
  if (tdpWatts !== undefined) {
    attrs.tdpWatts = tdpWatts;
  }

  return {
    ok: true,
    slot: slotRaw,
    attrs: Object.keys(attrs).length > 0 ? attrs : null,
  };
}
