/**
 * Database row -> domain type mapping (P10-T06).
 *
 * The domain types in `lib/data/types` are the contract the UI already renders
 * against, so these mappers exist to keep Prisma's shapes out of presentation
 * code entirely. Row types are written structurally rather than imported from
 * the generated client: a query result carrying extra fields still satisfies
 * them, and nothing outside this folder ends up depending on the ORM.
 */
import type {
  BuilderAttrs,
  BuilderCandidate,
  BuilderSlot,
  Brand,
  Category,
  ProductDetail,
  ProductSummary,
} from "@/lib/data/types/catalog";
import type {
  Money,
  ProductImage,
  SpecChip,
  SpecGroup,
  StockStatus,
} from "@/lib/data/types/common";
import { effectiveStorefrontPricing } from "@/lib/catalog/discount-pricing";
import { isWithinNewArrivalWindow } from "@/lib/catalog/new-arrival";
import { warrantyBadgeFromLabel } from "@/lib/catalog/warranty-badge";
import {
  resolveProductLabels,
  resolveProductNotes,
  type ProductPresetLookup,
} from "@/lib/catalog/product-notes-labels";
import type { ProductQuestion, ProductReview } from "@/lib/data/types/reviews";
import { CURRENCY_CODE } from "@/lib/format/currency";

/** Matches `features/product/product-gallery.tsx` for products with no image. */
export const PLACEHOLDER_IMAGE_SRC = "/products/placeholder.svg";

type DbStockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

type DbBuilderSlot =
  | "CPU"
  | "CPU_COOLER"
  | "MOTHERBOARD"
  | "RAM"
  | "GPU"
  | "SSD"
  | "HDD"
  | "PSU"
  | "CASE"
  | "CASE_FANS"
  | "MONITOR"
  | "KEYBOARD"
  | "MOUSE"
  | "UPS"
  | "SPEAKER"
  | "HEADPHONE"
  | "NETWORK_ADAPTER"
  | "ANTIVIRUS";

const STOCK_STATUS: Record<DbStockStatus, StockStatus> = {
  IN_STOCK: "in_stock",
  LOW_STOCK: "low_stock",
  OUT_OF_STOCK: "out_of_stock",
};

const BUILDER_SLOT: Record<DbBuilderSlot, BuilderSlot> = {
  CPU: "cpu",
  CPU_COOLER: "cpu_cooler",
  MOTHERBOARD: "motherboard",
  RAM: "ram",
  GPU: "gpu",
  SSD: "ssd",
  HDD: "hdd",
  PSU: "psu",
  CASE: "case",
  CASE_FANS: "case_fans",
  MONITOR: "monitor",
  KEYBOARD: "keyboard",
  MOUSE: "mouse",
  UPS: "ups",
  SPEAKER: "speaker",
  HEADPHONE: "headphone",
  NETWORK_ADAPTER: "network_adapter",
  ANTIVIRUS: "antivirus",
};

export function toStockStatus(value: DbStockStatus): StockStatus {
  return STOCK_STATUS[value];
}

export function toBuilderSlot(value: DbBuilderSlot): BuilderSlot {
  return BUILDER_SLOT[value];
}

export function toDbStockStatus(value: StockStatus): DbStockStatus {
  const reverse: Record<StockStatus, DbStockStatus> = {
    in_stock: "IN_STOCK",
    low_stock: "LOW_STOCK",
    out_of_stock: "OUT_OF_STOCK",
  };
  return reverse[value];
}

export function toDbStockStatuses(values: StockStatus[]): DbStockStatus[] {
  return values.map(toDbStockStatus);
}

export function toDbBuilderSlot(value: BuilderSlot): DbBuilderSlot {
  const reverse = Object.entries(BUILDER_SLOT).find(
    ([, domain]) => domain === value,
  );
  // Every domain slot has a database counterpart; the map above is exhaustive.
  return (reverse?.[0] ?? "CPU") as DbBuilderSlot;
}

function money(amount: number): Money {
  return { amount, currency: CURRENCY_CODE };
}

export type BrandRow = {
  slug: string;
  name: string;
  logoSrc: string | null;
  description: string | null;
};

export function toBrand(row: BrandRow): Brand {
  return {
    slug: row.slug,
    name: row.name,
    logoSrc: row.logoSrc ?? PLACEHOLDER_IMAGE_SRC,
    description: row.description,
  };
}

export type CategoryRow = {
  slug: string;
  name: string;
  filterKeys: string[];
  extraBrandSlugs: string[];
  parent: { slug: string } | null;
};

export function toCategory(row: CategoryRow): Category {
  return {
    slug: row.slug,
    name: row.name,
    parentSlug: row.parent?.slug ?? null,
    filterKeys: row.filterKeys,
    extraBrandSlugs: row.extraBrandSlugs,
  };
}

export type ProductSummaryRow = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  priceAmount: number;
  compareAtAmount: number | null;
  discountStartsAt?: Date | null;
  discountEndsAt?: Date | null;
  stockStatus: DbStockStatus;
  createdAt?: Date | null;
  isNew: boolean;
  isSale: boolean;
  brand: { slug: string; name: string };
  category: { slug: string };
  warranty: { label: string; logoSrc: string | null } | null;
  labelIds?: string[];
  images: { src: string; alt: string }[];
  specChips: { label: string; value: string }[];
};

export function toProductSummary(
  row: ProductSummaryRow,
  presets: ProductPresetLookup,
): ProductSummary {
  const priced = effectiveStorefrontPricing({
    priceAmount: row.priceAmount,
    compareAtAmount: row.compareAtAmount,
    discountStartsAt: row.discountStartsAt,
    discountEndsAt: row.discountEndsAt,
    isSale: row.isSale,
  });
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandSlug: row.brand.slug,
    brandName: row.brand.name,
    categorySlug: row.category.slug,
    sku: row.sku,
    price: money(priced.priceAmount),
    compareAtPrice:
      priced.compareAtAmount == null ? null : money(priced.compareAtAmount),
    stockStatus: toStockStatus(row.stockStatus),
    warrantyLabel: row.warranty?.label ?? "",
    warrantyBadge: row.warranty?.label
      ? warrantyBadgeFromLabel(row.warranty.label)
      : null,
    warrantyLogoSrc: row.warranty?.logoSrc ?? null,
    image: primaryImage(row.images, row.name),
    specs: toSpecChips(row.specChips),
    isNew: row.isNew,
    isNewArrival: isWithinNewArrivalWindow(row.createdAt),
    isSale: priced.isSale,
    discountStartsAt: priced.discountActive
      ? row.discountStartsAt?.toISOString() ?? null
      : null,
    discountEndsAt: priced.discountActive
      ? row.discountEndsAt?.toISOString() ?? null
      : null,
    labels: resolveProductLabels(row.labelIds ?? [], presets),
    hasActiveOffer: presets.activeOfferProductIds.has(row.id),
  };
}

export type ProductCandidateRow = ProductSummaryRow & {
  builderSlot: DbBuilderSlot | null;
  builderSocket: string | null;
  builderRamType: string | null;
  builderFormFactor: string | null;
  builderTdpWatts: number | null;
  builderStorageInterface: string | null;
};

export function toBuilderCandidate(
  row: ProductCandidateRow,
  presets: ProductPresetLookup,
): BuilderCandidate {
  return {
    ...toProductSummary(row, presets),
    builderSlot: row.builderSlot ? toBuilderSlot(row.builderSlot) : null,
    builderAttrs: toBuilderAttrs(row),
  };
}

export type ProductDetailRow = ProductCandidateRow & {
  overview: string[];
  overviewHtml: string | null;
  detailsHtml: string | null;
  youtubeUrl: string | null;
  pdfSpecificationSrc: string | null;
  noteIds?: string[];
  colors: {
    id: string;
    name: string;
    hex: string | null;
    images: { src: string; alt: string }[];
  }[];
  images: { src: string; alt: string }[];
  specGroups: {
    title: string;
    rows: { label: string; value: string }[];
  }[];
  attributeValues: {
    value: string;
    attribute: { key: string; label: string };
  }[];
  relatedTo: { slug: string }[];
};

export function toProductDetail(
  row: ProductDetailRow,
  presets: ProductPresetLookup,
): ProductDetail {
  const attributes = toAttributes(row.attributeValues);
  return {
    ...toProductSummary(row, presets),
    overview: row.overview,
    overviewHtml: row.overviewHtml,
    detailsHtml: row.detailsHtml,
    specs: mergeSpecChipsWithAttributes(
      toSpecChips(row.specChips),
      row.attributeValues,
    ),
    specGroups: mergeSpecGroupsWithAttributes(
      toSpecGroups(row.specGroups),
      row.attributeValues,
    ),
    images: toImages(row.images, row.name),
    relatedSlugs: row.relatedTo.map((related) => related.slug),
    attributes,
    colors: row.colors.map((color) => ({
      id: color.id,
      name: color.name,
      hex: color.hex,
      images: color.images.map((image) => ({
        src: image.src,
        alt: image.alt || `${row.name} — ${color.name}`,
      })),
    })),
    builderSlot: row.builderSlot ? toBuilderSlot(row.builderSlot) : null,
    builderAttrs: toBuilderAttrs(row),
    youtubeUrl: row.youtubeUrl,
    pdfSpecificationSrc: row.pdfSpecificationSrc,
    notes: resolveProductNotes(row.noteIds ?? [], presets),
  };
}

function primaryImage(
  images: { src: string; alt: string }[],
  productName: string,
): ProductImage {
  const first = images[0];
  if (!first) {
    return { src: PLACEHOLDER_IMAGE_SRC, alt: productName };
  }
  return { src: first.src, alt: first.alt };
}

function toImages(
  images: { src: string; alt: string }[],
  productName: string,
): ProductImage[] {
  if (images.length === 0) {
    return [{ src: PLACEHOLDER_IMAGE_SRC, alt: productName }];
  }
  return images.map((image) => ({ src: image.src, alt: image.alt }));
}

function toSpecChips(chips: { label: string; value: string }[]): SpecChip[] {
  return chips.map((chip) => ({ label: chip.label, value: chip.value }));
}

function toSpecGroups(
  groups: { title: string; rows: { label: string; value: string }[] }[],
): SpecGroup[] {
  return groups.map((group) => ({
    title: group.title,
    rows: group.rows.map((row) => ({ key: row.label, value: row.value })),
  }));
}

function toAttributes(
  values: { value: string; attribute: { key: string; label?: string } }[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const entry of values) {
    attributes[entry.attribute.key] = entry.value;
  }
  return attributes;
}

type AttributeValueRow = {
  value: string;
  attribute: { key: string; label: string };
};

function attributeLabel(entry: AttributeValueRow): string {
  const label = entry.attribute.label?.trim();
  if (label) {
    return label;
  }
  return entry.attribute.key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Spec chips / tables are optional presentation. Admin-assigned filter
 * attributes must still appear on the product page when chips/groups are
 * empty (or when attributes add rows not already covered).
 */
function mergeSpecChipsWithAttributes(
  chips: SpecChip[],
  attributeValues: AttributeValueRow[],
): SpecChip[] {
  if (chips.length > 0 || attributeValues.length === 0) {
    return chips;
  }
  return attributeValues.map((entry) => ({
    label: attributeLabel(entry),
    value: entry.value,
  }));
}

function mergeSpecGroupsWithAttributes(
  groups: SpecGroup[],
  attributeValues: AttributeValueRow[],
): SpecGroup[] {
  if (attributeValues.length === 0) {
    return groups;
  }

  const attrRows = attributeValues.map((entry) => ({
    key: attributeLabel(entry),
    value: entry.value,
  }));

  const hasGroupRows = groups.some((group) => group.rows.length > 0);
  if (!hasGroupRows) {
    return [{ title: "Specifications", rows: attrRows }];
  }

  const existing = new Set(
    groups.flatMap((group) =>
      group.rows.map((row) => row.key.trim().toLowerCase()),
    ),
  );
  const extra = attrRows.filter(
    (row) => !existing.has(row.key.trim().toLowerCase()),
  );
  if (extra.length === 0) {
    return groups;
  }
  return [...groups, { title: "Attributes", rows: extra }];
}

function toBuilderAttrs(row: {
  builderSocket: string | null;
  builderRamType: string | null;
  builderFormFactor: string | null;
  builderTdpWatts: number | null;
  builderStorageInterface: string | null;
}): BuilderAttrs | null {
  const attrs: BuilderAttrs = {};
  if (row.builderSocket != null) {
    attrs.socket = row.builderSocket;
  }
  if (row.builderRamType != null) {
    attrs.ramType = row.builderRamType;
  }
  if (row.builderFormFactor != null) {
    attrs.formFactor = row.builderFormFactor;
  }
  if (row.builderTdpWatts != null) {
    attrs.tdpWatts = row.builderTdpWatts;
  }
  if (row.builderStorageInterface != null) {
    attrs.storageInterface = row.builderStorageInterface;
  }
  return Object.keys(attrs).length > 0 ? attrs : null;
}

export type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
  product: { slug: string };
};

export function toProductReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productSlug: row.product.slug,
    authorName: row.authorName,
    rating: row.rating,
    title: row.title ?? "",
    body: row.body,
    createdAt: toDateString(row.createdAt),
  };
}

export type QuestionRow = {
  id: string;
  askerName: string;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  createdAt: Date;
  product: { slug: string };
};

export function toProductQuestion(row: QuestionRow): ProductQuestion {
  return {
    id: row.id,
    productSlug: row.product.slug,
    askerName: row.askerName,
    question: row.question,
    answer: row.answer,
    answeredBy: row.answeredBy,
    createdAt: toDateString(row.createdAt),
  };
}

/** The domain type carries `YYYY-MM-DD`, which is what the UI formats. */
function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}
