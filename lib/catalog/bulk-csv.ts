/**
 * Real product bulk import/export CSV (AD-274).
 *
 * Import reuses the exact same validation and persistence path as the
 * single-product admin form (`saveAdminProduct` / `parseProductInput`) per
 * row — no parallel write logic, no bypass of the real rules (slug/SKU
 * uniqueness, price rules, stock limits, etc.).
 *
 * Scope: core fields only (name, brand, category, pricing, stock, one
 * image, overview, a few flags). Variants, colors, attributes, and spec
 * groups are not covered by bulk CSV — those still need the single-product
 * editor. This is a deliberate, disclosed limit, not an oversight: those
 * are nested per-row structures that don't map cleanly onto flat CSV rows.
 */
import Papa from "papaparse";
import {
  saveAdminProduct,
  usesCatalogDatabase,
  type ProductActor,
} from "@/lib/catalog/admin-products";
import {
  normalizeSku,
  slugifyProduct,
  type ProductInputFields,
} from "@/lib/catalog/product-input";
import { getPrisma } from "@/lib/db/prisma";

export const BULK_CSV_HEADERS = [
  "sku",
  "name",
  "slug",
  "brand",
  "category",
  "price",
  "compare_at_price",
  "quantity",
  "low_stock_threshold",
  "position",
  "weight_grams",
  "is_active",
  "is_new",
  "is_sale",
  "warranty_label",
  "youtube_url",
  "image_url",
  "image_alt",
  "overview",
] as const;

const IMPORT_MAX_ROWS = 1000;
const EXPORT_MAX_ROWS = 10_000;

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvLine(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

export function buildImportTemplateCsv(): string {
  const example = [
    "TH-EXAMPLE-001",
    "Example Wireless Mouse",
    "example-wireless-mouse",
    "logitech",
    "accessories",
    "1490",
    "1990",
    "50",
    "5",
    "0",
    "300",
    "true",
    "false",
    "true",
    "1 Year Official Warranty",
    "",
    "",
    "",
    "A comfortable wireless mouse for everyday work.",
  ];
  return `${csvLine([...BULK_CSV_HEADERS])}\n${csvLine(example)}\n`;
}

function toBool(value: string | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function fieldsFromCsvRow(row: Record<string, string>): ProductInputFields {
  const name = (row.name ?? "").trim();
  const rawSlug = (row.slug ?? "").trim();
  return {
    name,
    slug: rawSlug ? rawSlug : slugifyProduct(name),
    sku: row.sku ?? "",
    brandSlug: (row.brand ?? "").trim(),
    categorySlug: (row.category ?? "").trim(),
    position: row.position ?? "",
    weightGrams: row.weight_grams ?? "",
    price: row.price ?? "",
    compareAt: row.compare_at_price ?? "",
    discountStartsAt: "",
    discountEndsAt: "",
    overview: row.overview ?? "",
    quantity: row.quantity ?? "",
    lowStockThreshold: row.low_stock_threshold ?? "",
    isActive: row.is_active === undefined ? true : toBool(row.is_active),
    isNew: toBool(row.is_new),
    isSale: toBool(row.is_sale),
    warrantyEnabled: Boolean((row.warranty_label ?? "").trim()),
    warrantyLabel: row.warranty_label ?? "",
    // Deliberately omitted, not `[]` — the bulk CSV format has no columns
    // for these, and `[]` would tell saveAdminProduct to wipe whatever a
    // matching-SKU product already has on every re-import (see
    // ProductInputFields in product-input.ts).
    builderSlot: "",
    builderSocket: "",
    builderRamType: "",
    builderFormFactor: "",
    builderTdpWatts: "",
    builderStorageInterface: "",
    youtubeUrl: row.youtube_url ?? "",
    pdfSpecificationSrc: "",
    thumbnailSrc: (row.image_url ?? "").trim() || undefined,
  };
}

export type ImportRowResult = {
  row: number;
  sku: string;
  name: string;
  status: "created" | "updated" | "failed";
  error?: string;
};

export type ImportSummary = {
  results: ImportRowResult[];
  created: number;
  updated: number;
  failed: number;
};

export type ImportCsvResult =
  | { ok: true; summary: ImportSummary }
  | { ok: false; formError: string };

export async function importProductsFromCsvText(
  csvText: string,
  actor?: ProductActor,
): Promise<ImportCsvResult> {
  if (!usesCatalogDatabase()) {
    return {
      ok: false,
      formError: "Bulk import needs the database. Turn off DATA_SOURCE=mock.",
    };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  if (parsed.errors.length > 0) {
    const first = parsed.errors[0];
    return {
      ok: false,
      formError: `Could not read the CSV file (row ${first?.row != null ? first.row + 2 : "?"}: ${first?.message ?? "parse error"}).`,
    };
  }
  const rows = parsed.data.filter((row) =>
    Object.values(row).some((value) => value?.trim()),
  );
  if (rows.length === 0) {
    return { ok: false, formError: "The CSV file has no data rows." };
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    return {
      ok: false,
      formError: `A single import is limited to ${IMPORT_MAX_ROWS} rows — split the file and try again.`,
    };
  }

  const prisma = getPrisma();
  const results: ImportRowResult[] = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const raw = rows[i]!;
    const rowNum = i + 2; // header is CSV row 1
    const sku = normalizeSku(raw.sku ?? "");
    const name = (raw.name ?? "").trim();

    if (!sku) {
      failed += 1;
      results.push({ row: rowNum, sku: "", name, status: "failed", error: "Missing SKU." });
      continue;
    }

    try {
      const existing = await prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });

      const fields = fieldsFromCsvRow(raw);
      const result = await saveAdminProduct({
        currentId: existing?.id,
        fields,
        actor,
      });

      if (!result.ok) {
        failed += 1;
        results.push({ row: rowNum, sku, name, status: "failed", error: result.formError });
        continue;
      }

      if (existing) {
        updated += 1;
        results.push({ row: rowNum, sku, name, status: "updated" });
      } else {
        created += 1;
        results.push({ row: rowNum, sku, name, status: "created" });
      }
    } catch (error) {
      failed += 1;
      results.push({
        row: rowNum,
        sku,
        name,
        status: "failed",
        error: error instanceof Error ? error.message : "Unexpected error.",
      });
    }
  }

  return { ok: true, summary: { results, created, updated, failed } };
}

export type ExportProductRow = {
  sku: string;
  name: string;
  slug: string;
  brandSlug: string;
  categorySlug: string;
  priceAmount: number;
  compareAtAmount: number | null;
  quantity: number;
  lowStockThreshold: number;
  position: number;
  weightGrams: number;
  isActive: boolean;
  isNew: boolean;
  isSale: boolean;
  warrantyLabel: string;
  youtubeUrl: string;
  imageSrc: string;
  imageAlt: string;
  overview: string[];
};

/** Real, full catalog — bypasses the storefront listing repository's page-size cap. */
export async function listAllProductsForExport(): Promise<ExportProductRow[]> {
  if (!usesCatalogDatabase()) {
    return [];
  }
  const rows = await getPrisma().product.findMany({
    orderBy: { position: "asc" },
    take: EXPORT_MAX_ROWS,
    select: {
      sku: true,
      name: true,
      slug: true,
      priceAmount: true,
      compareAtAmount: true,
      position: true,
      weightGrams: true,
      isActive: true,
      isNew: true,
      isSale: true,
      youtubeUrl: true,
      overview: true,
      brand: { select: { slug: true } },
      category: { select: { slug: true } },
      warranty: { select: { label: true } },
      stock: { select: { quantity: true, lowStockThreshold: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: { src: true, alt: true },
      },
    },
  });

  return rows.map((row) => ({
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    brandSlug: row.brand.slug,
    categorySlug: row.category.slug,
    priceAmount: row.priceAmount,
    compareAtAmount: row.compareAtAmount,
    quantity: row.stock?.quantity ?? 0,
    lowStockThreshold: row.stock?.lowStockThreshold ?? 5,
    position: row.position,
    weightGrams: row.weightGrams,
    isActive: row.isActive,
    isNew: row.isNew,
    isSale: row.isSale,
    warrantyLabel: row.warranty?.label ?? "",
    youtubeUrl: row.youtubeUrl ?? "",
    imageSrc: row.images[0]?.src ?? "",
    imageAlt: row.images[0]?.alt ?? "",
    overview: row.overview,
  }));
}

export function buildProductsExportCsv(rows: ExportProductRow[]): string {
  const lines = rows.map((row) =>
    csvLine([
      row.sku,
      row.name,
      row.slug,
      row.brandSlug,
      row.categorySlug,
      String(row.priceAmount),
      row.compareAtAmount != null ? String(row.compareAtAmount) : "",
      String(row.quantity),
      String(row.lowStockThreshold),
      String(row.position),
      String(row.weightGrams),
      row.isActive ? "true" : "false",
      row.isNew ? "true" : "false",
      row.isSale ? "true" : "false",
      row.warrantyLabel,
      row.youtubeUrl,
      row.imageSrc,
      row.imageAlt,
      row.overview.join("\n\n"),
    ]),
  );
  return `${csvLine([...BULK_CSV_HEADERS])}\n${lines.join("\n")}\n`;
}
