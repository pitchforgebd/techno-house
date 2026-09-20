/**
 * Server-only counterpart to `product-input.ts` (Phase 14).
 *
 * `parseProductInput` needs Prisma to validate note/label/related-product
 * ids against real rows — importing it (or anything that transitively
 * imports it) from a Client Component breaks the production build, since
 * the bundler then tries to ship `pg`/Node built-ins to the browser. Only
 * import this file from server-only code (server actions, other `lib/`
 * files) — never from a `"use client"` component.
 */
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  deriveStockStatus,
  parseStockInt,
  STOCK_QUANTITY_MAX,
  STOCK_THRESHOLD_MAX,
} from "@/lib/catalog/inventory-input";
import { normalizePdfSpecificationSrc } from "@/lib/product/pdf-specification";
import { normalizeYoutubeUrl } from "@/lib/product/youtube";
import { sanitizeRichBody } from "@/lib/content/sanitize-html";
import { parseProductColors } from "@/lib/catalog/color-input";
import {
  computeDiscountPricing,
  parseDiscountDate,
  type DiscountType,
} from "@/lib/catalog/discount-pricing";
import { parseSpecGroups } from "@/lib/catalog/spec-group-input";
import {
  parseProductLabelIds,
  parseProductNoteIds,
} from "@/lib/catalog/product-notes-labels-server";
import { parseRelatedProductIds } from "@/lib/catalog/product-related";
import {
  normalizeSku,
  parseBuilderFields,
  parseOverview,
  parseProductAttributes,
  parseProductPosition,
  parseProductWeightGrams,
  parseTaka,
  parseVariants,
  slugifyProduct,
  PRODUCT_BARCODE_MAX,
  PRODUCT_CONTENT_HTML_MAX,
  PRODUCT_NAME_MAX,
  PRODUCT_WARRANTY_MAX,
  PRODUCT_WEIGHT_GRAMS_MAX,
  type ParsedProductInput,
  type ProductInputFields,
} from "@/lib/catalog/product-input";

export async function parseProductInput(
  input: ProductInputFields,
  /** The product being edited, if any — lets related-product ids reject self-reference. */
  currentProductId?: string,
): Promise<
  { ok: true; value: ParsedProductInput } | { ok: false; formError: string }
> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, formError: "Enter a product name." };
  }
  if (name.length > PRODUCT_NAME_MAX) {
    return { ok: false, formError: "Product name is too long." };
  }

  const slug = slugifyProduct(input.slug);
  if (!slug) {
    return { ok: false, formError: "Enter a URL slug." };
  }

  const sku = normalizeSku(input.sku);
  if (!sku) {
    return { ok: false, formError: "Enter a SKU." };
  }

  const brandSlug = input.brandSlug.trim();
  if (!brandSlug) {
    return { ok: false, formError: "Select a brand." };
  }

  const categorySlug = input.categorySlug.trim();
  if (!categorySlug) {
    return { ok: false, formError: "Select a category." };
  }

  const position = parseProductPosition(input.position);
  if (position === null) {
    return {
      ok: false,
      formError: "Ordering number must be a whole number.",
    };
  }

  const weightGrams = parseProductWeightGrams(input.weightGrams);
  if (weightGrams === null) {
    return {
      ok: false,
      formError: `Weight must be a whole number of grams (1–${PRODUCT_WEIGHT_GRAMS_MAX.toLocaleString("en-US")}).`,
    };
  }

  const specialPrice = parseTaka(input.price, "special price");
  if (typeof specialPrice === "string") {
    return { ok: false, formError: specialPrice };
  }

  const compareRaw = (input.compareAt ?? "").trim();
  let compareAtAmount: number | null = null;
  if (compareRaw && compareRaw !== "0" && compareRaw !== "0.00") {
    const compareParsed = parseTaka(input.compareAt, "regular price");
    if (typeof compareParsed === "string") {
      return { ok: false, formError: compareParsed };
    }
    if (compareParsed > 0 && compareParsed <= specialPrice) {
      return {
        ok: false,
        formError: "Regular price must be higher than the special price.",
      };
    }
    compareAtAmount = compareParsed > specialPrice ? compareParsed : null;
  }

  // Optional: unit + percent/flat helper still accepted (admin quick apply).
  const discountRaw = input.discountValue?.trim() ?? "";
  const discountValue =
    discountRaw === ""
      ? 0
      : Number.parseFloat(discountRaw.replace(/,/g, ""));
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return { ok: false, formError: "Discount must be zero or a positive number." };
  }

  let priceAmount = specialPrice;
  let pricedAsSale = compareAtAmount != null;

  if (discountValue > 0 && compareAtAmount == null) {
    const discountType: DiscountType =
      input.discountType === "flat" ? "flat" : "percent";
    const priced = computeDiscountPricing({
      unitPrice: specialPrice,
      discountValue,
      discountType,
    });
    if ("ok" in priced && priced.ok === false) {
      return { ok: false, formError: priced.reason };
    }
    if (!("ok" in priced)) {
      priceAmount = priced.priceAmount;
      compareAtAmount = priced.compareAtAmount;
      pricedAsSale = priced.isSale;
    }
  }

  const discountStartsAt = parseDiscountDate(
    input.discountStartsAt ?? "",
    "Discount start date",
  );
  if (discountStartsAt && "ok" in discountStartsAt && discountStartsAt.ok === false) {
    return { ok: false, formError: discountStartsAt.reason };
  }
  const discountEndsAt = parseDiscountDate(
    input.discountEndsAt ?? "",
    "Discount end date",
  );
  if (discountEndsAt && "ok" in discountEndsAt && discountEndsAt.ok === false) {
    return { ok: false, formError: discountEndsAt.reason };
  }
  const startDate =
    discountStartsAt instanceof Date ? discountStartsAt : null;
  const endDate = discountEndsAt instanceof Date ? discountEndsAt : null;
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return {
      ok: false,
      formError: "Discount end date must be on or after the start date.",
    };
  }

  const overview = parseOverview(input.overview);
  if (typeof overview === "string") {
    return { ok: false, formError: overview };
  }

  // `undefined` = not submitted (leave whatever the product already has),
  // matching attributes/colors/specGroups above — the single-product form
  // always submits a string (possibly empty, which clears it to `null`).
  let overviewHtml: string | null | undefined;
  if (input.overviewHtml !== undefined) {
    const result = sanitizeRichBody(input.overviewHtml, {
      maxLength: PRODUCT_CONTENT_HTML_MAX,
      tooLongError: "Quick overview is too long.",
    });
    if (!result.ok) {
      return result;
    }
    overviewHtml = result.value;
  }

  let detailsHtml: string | null | undefined;
  if (input.detailsHtml !== undefined) {
    const result = sanitizeRichBody(input.detailsHtml, {
      maxLength: PRODUCT_CONTENT_HTML_MAX,
      tooLongError: "Details is too long.",
    });
    if (!result.ok) {
      return result;
    }
    detailsHtml = result.value;
  }

  const quantity = parseStockInt(
    input.quantity,
    "Stock quantity",
    STOCK_QUANTITY_MAX,
  );
  if (typeof quantity === "string") {
    return { ok: false, formError: quantity };
  }
  const lowStockThreshold = parseStockInt(
    input.lowStockThreshold.trim()
      ? input.lowStockThreshold
      : String(DEFAULT_LOW_STOCK_THRESHOLD),
    "Low-stock threshold",
    STOCK_THRESHOLD_MAX,
  );
  if (typeof lowStockThreshold === "string") {
    return { ok: false, formError: lowStockThreshold };
  }

  let warrantyLabel: string | null = null;
  if (input.warrantyEnabled) {
    const label = input.warrantyLabel.trim();
    if (!label) {
      return {
        ok: false,
        formError: "Enter a warranty label, or turn warranty off.",
      };
    }
    if (label.length > PRODUCT_WARRANTY_MAX) {
      return { ok: false, formError: "Warranty label is too long." };
    }
    warrantyLabel = label;
  }

  const noteIds = await parseProductNoteIds(input.noteIds);
  if (!noteIds.ok) {
    return noteIds;
  }
  const labelIds = await parseProductLabelIds(input.labelIds);
  if (!labelIds.ok) {
    return labelIds;
  }

  let barcode: string | null = null;
  if (input.barcode !== undefined) {
    const trimmedBarcode = input.barcode.trim();
    if (trimmedBarcode) {
      if (trimmedBarcode.length > PRODUCT_BARCODE_MAX) {
        return {
          ok: false,
          formError: `Barcode must be ${PRODUCT_BARCODE_MAX} characters or fewer.`,
        };
      }
      if (!/^[A-Za-z0-9-]+$/.test(trimmedBarcode)) {
        return {
          ok: false,
          formError:
            "Barcode may only contain letters, numbers, and dashes.",
        };
      }
      barcode = trimmedBarcode;
    }
  }

  const relatedProductIds = await parseRelatedProductIds(
    input.relatedProductIds,
    currentProductId,
  );
  if (!relatedProductIds.ok) {
    return relatedProductIds;
  }

  // `undefined` (the bulk CSV importer's case — it has no column for any of
  // these four) skips validation entirely and passes `undefined` straight
  // through, so the sync step in admin-products.ts leaves whatever the
  // product already has untouched instead of wiping it on every re-import.
  const variants =
    input.variants === undefined
      ? { ok: true as const, value: undefined }
      : parseVariants(input.variants, sku);
  if (!variants.ok) {
    return variants;
  }

  const attributes =
    input.attributes === undefined
      ? { ok: true as const, value: undefined }
      : parseProductAttributes(input.attributes);
  if (!attributes.ok) {
    return attributes;
  }

  const colors =
    input.colors === undefined
      ? { ok: true as const, value: undefined }
      : parseProductColors(input.colors);
  if (!colors.ok) {
    return colors;
  }

  const specGroups =
    input.specGroups === undefined
      ? { ok: true as const, value: undefined }
      : parseSpecGroups(input.specGroups);
  if (!specGroups.ok) {
    return specGroups;
  }

  const builder = parseBuilderFields(input);
  if (!builder.ok) {
    return builder;
  }

  function normalizeProductImage(
    raw: string | undefined,
  ): string | null | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const value = raw.trim();
    if (!value) {
      return null;
    }
    if (value.includes("..") || value.includes("\\")) {
      return undefined;
    }

    // Local public path: /products/…, /uploads/…, etc.
    if (value.startsWith("/") && !value.startsWith("//")) {
      return value.slice(0, 240);
    }

    // Absolute http(s) — seeded catalogue images use Unsplash (and similar)
    // CDNs. Staff can keep those when editing other fields, or replace with
    // a media-library local path.
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

  const thumbnailSrc = normalizeProductImage(input.thumbnailSrc);
  if (input.thumbnailSrc !== undefined && thumbnailSrc === undefined) {
    return {
      ok: false,
      formError:
        "Thumbnail must be a local public path (e.g. /uploads/…) or an http(s) image URL.",
    };
  }
  const gallerySrc = normalizeProductImage(input.gallerySrc);
  if (input.gallerySrc !== undefined && gallerySrc === undefined) {
    return {
      ok: false,
      formError:
        "Gallery image must be a local public path (e.g. /uploads/…) or an http(s) image URL.",
    };
  }

  const youtube = normalizeYoutubeUrl(input.youtubeUrl ?? "");
  if (!youtube.ok) {
    return youtube;
  }

  const pdfSpecificationSrc = normalizePdfSpecificationSrc(
    input.pdfSpecificationSrc ?? "",
  );
  if (pdfSpecificationSrc === undefined) {
    return {
      ok: false,
      formError:
        "PDF specification must be a local .pdf path (e.g. /uploads/…) or an http(s) PDF URL.",
    };
  }

  return {
    ok: true,
    value: {
      name,
      slug,
      sku,
      brandSlug,
      categorySlug,
      position,
      weightGrams,
      priceAmount,
      compareAtAmount,
      discountStartsAt: pricedAsSale ? startDate : null,
      discountEndsAt: pricedAsSale ? endDate : null,
      overview,
      overviewHtml,
      detailsHtml,
      quantity,
      lowStockThreshold,
      stockStatus: deriveStockStatus(quantity, 0, lowStockThreshold),
      isActive: input.isActive,
      isNew: input.isNew,
      isSale: input.isSale || pricedAsSale,
      warrantyLabel,
      noteIds: noteIds.value,
      labelIds: labelIds.value,
      barcode,
      relatedProductIds: relatedProductIds.value,
      variants: variants.value,
      attributes: attributes.value,
      colors: colors.value,
      specGroups: specGroups.value,
      builderSlot: builder.slot,
      builderAttrs: builder.attrs,
      youtubeUrl: youtube.value,
      pdfSpecificationSrc,
      ...(thumbnailSrc !== undefined ? { thumbnailSrc } : {}),
      ...(gallerySrc !== undefined ? { gallerySrc } : {}),
    },
  };
}
