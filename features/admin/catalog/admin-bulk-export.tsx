"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifySuccess } from "@/components/ui/feedback-provider";

/** Mirrors ExportProductRow in lib/catalog/bulk-csv.ts (server-only, not importable from a client component). */
export type AdminExportProductRow = {
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

/** Mirrors BULK_CSV_HEADERS in lib/catalog/bulk-csv.ts — kept identical so export/import round-trip. */
const HEADERS = [
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
];

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildProductsCsv(products: AdminExportProductRow[]): string {
  const rows = products.map((product) =>
    [
      product.sku,
      product.name,
      product.slug,
      product.brandSlug,
      product.categorySlug,
      String(product.priceAmount),
      product.compareAtAmount != null ? String(product.compareAtAmount) : "",
      String(product.quantity),
      String(product.lowStockThreshold),
      String(product.position),
      String(product.weightGrams),
      product.isActive ? "true" : "false",
      product.isNew ? "true" : "false",
      product.isSale ? "true" : "false",
      product.warrantyLabel,
      product.youtubeUrl,
      product.imageSrc,
      product.imageAlt,
      product.overview.join("\n\n"),
    ]
      .map(escapeCsv)
      .join(","),
  );

  return `${HEADERS.join(",")}\n${rows.join("\n")}\n`;
}

export function AdminBulkExport({
  products,
}: {
  products: AdminExportProductRow[];
}) {
  function handleDownload() {
    const csv = buildProductsCsv(products);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `techno-house-products-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notifySuccess({
      title: "Products CSV downloaded",
      description: `${products.length} product${products.length === 1 ? "" : "s"} exported.`,
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-800">
          Bulk export
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Download every real catalog product as a CSV file — the same
          columns the bulk import template uses, so this file can be edited
          and re-imported directly.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-body text-neutral-600">
          Exports{" "}
          <span className="font-semibold tabular-nums text-neutral-800">
            {products.length}
          </span>{" "}
          product{products.length === 1 ? "" : "s"} — SKU, name, slug, brand,
          category, pricing, stock, weight, flags, warranty, YouTube link,
          image, and overview.
        </p>

        <Button
          type="button"
          onClick={handleDownload}
          disabled={products.length === 0}
          className="min-h-10 gap-2 bg-violet-600 px-4 hover:bg-violet-700"
        >
          <Download className="size-4" aria-hidden />
          Download all products CSV
        </Button>
      </section>
    </div>
  );
}
