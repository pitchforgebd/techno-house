/**
 * The tables that make up the product catalogue, in the order they must be
 * inserted (parents before children). Shared by the catalog exporter and
 * importer so the two can never disagree about what a bundle contains.
 *
 * Deliberately NOT here: staff, customers, orders, carts, payments, reviews,
 * promotions, analytics, audit logs and every secret-bearing settings table.
 * A catalogue bundle must never be able to carry any of those into production.
 */
export type CatalogTable = {
  /** Prisma client delegate name, e.g. `productImage`. */
  delegate: string;
  /** SQL table name, for counts and the join table. */
  table: string;
};

export const CATALOG_TABLES: readonly CatalogTable[] = [
  { delegate: "productUnit", table: "ProductUnit" },
  { delegate: "productNotePreset", table: "ProductNotePreset" },
  { delegate: "productLabelPreset", table: "ProductLabelPreset" },
  { delegate: "productWarranty", table: "ProductWarranty" },
  { delegate: "brand", table: "Brand" },
  { delegate: "category", table: "Category" },
  { delegate: "productAttribute", table: "ProductAttribute" },
  { delegate: "mediaAsset", table: "MediaAsset" },
  { delegate: "product", table: "Product" },
  { delegate: "productImage", table: "ProductImage" },
  { delegate: "productVariant", table: "ProductVariant" },
  { delegate: "productAttributeValue", table: "ProductAttributeValue" },
  { delegate: "productColor", table: "ProductColor" },
  { delegate: "productColorImage", table: "ProductColorImage" },
  { delegate: "productSpecChip", table: "ProductSpecChip" },
  { delegate: "productSpecGroup", table: "ProductSpecGroup" },
  { delegate: "productSpecRow", table: "ProductSpecRow" },
  { delegate: "productStock", table: "ProductStock" },
] as const;

/** Implicit many-to-many join table for related products (columns "A" and "B"). */
export const RELATED_PRODUCTS_TABLE = "_RelatedProducts";

/** Minimal shape of a Prisma model delegate, so the scripts can loop over them. */
export type Delegate = {
  findMany(args?: unknown): Promise<Record<string, unknown>[]>;
  createMany(args: {
    data: unknown[];
    skipDuplicates?: boolean;
  }): Promise<{ count: number }>;
  count(): Promise<number>;
};

/** JSON text for one row; Dates become `{ "$date": iso }` so they survive the round trip. */
export function serializeRow(row: Record<string, unknown>): string {
  return JSON.stringify(row, function (this: Record<string, unknown>, key, value) {
    const raw = this[key];
    return raw instanceof Date ? { $date: raw.toISOString() } : value;
  });
}

export function reviveRow(line: string): Record<string, unknown> {
  return JSON.parse(line, (_key, value) =>
    value && typeof value === "object" && "$date" in value
      ? new Date((value as { $date: string }).$date)
      : value,
  ) as Record<string, unknown>;
}
