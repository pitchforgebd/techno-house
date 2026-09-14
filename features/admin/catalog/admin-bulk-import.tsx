"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { adminFormControlClass } from "@/features/admin/products/admin-product-form-primitives";
import { importProductsCsvAction } from "@/features/admin/catalog/bulk-import-actions";
import { cn } from "@/lib/cn";

/** Mirrors BULK_CSV_HEADERS / buildImportTemplateCsv in lib/catalog/bulk-csv.ts (server-only, not importable from a client component). */
const TEMPLATE_HEADERS = [
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

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildTemplateCsv(): string {
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
  return `${TEMPLATE_HEADERS.join(",")}\n${example.map(escapeCsv).join(",")}\n`;
}

function buildReferenceCsv(refs: {
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
}): string {
  const lines: string[] = [
    "# Techno House bulk import — real category/brand slugs",
    "# Use the slug column values in the products template CSV.",
    "",
    "## categories",
    "name,slug",
    ...refs.categories.map((row) => `${escapeCsv(row.name)},${escapeCsv(row.slug)}`),
    "",
    "## brands",
    "name,slug",
    ...refs.brands.map((row) => `${escapeCsv(row.name)},${escapeCsv(row.slug)}`),
    "",
  ];
  return lines.join("\n");
}

type ImportRowResult = {
  row: number;
  sku: string;
  name: string;
  status: "created" | "updated" | "failed";
  error?: string;
};

export function AdminBulkImport({
  categories,
  brands,
}: {
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [summary, setSummary] = useState<{ created: number; updated: number; failed: number } | null>(null);

  function handleDownload() {
    downloadTextFile("techno-house-product-import-template.csv", buildTemplateCsv());
    window.setTimeout(() => {
      downloadTextFile(
        "techno-house-import-brand-category-slugs.csv",
        buildReferenceCsv({ categories, brands }),
      );
      notifySuccess({
        title: "CSV templates downloaded",
        description: "Product template + real brand/category slug reference.",
      });
    }, 250);
  }

  function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      notifyError({
        title: "Choose a CSV file first",
        description: "Select a filled product template CSV to upload.",
      });
      return;
    }
    startTransition(async () => {
      const text = await file.text();
      const result = await importProductsCsvAction(text);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setResults(result.summary.results);
      setSummary({
        created: result.summary.created,
        updated: result.summary.updated,
        failed: result.summary.failed,
      });
      notifySuccess({
        title: "Import finished",
        description: `${result.summary.created} created, ${result.summary.updated} updated, ${result.summary.failed} failed.`,
      });
      setFile(null);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-800">
          Product bulk import
        </h1>
        <p className="mt-1 text-body text-text-muted">
          Create or update many products at once with a CSV file.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-800">How it works</h2>

        <Alert tone="info" title="Real, live import — reads and writes your real catalog">
          <ol className="mt-2 list-decimal space-y-2 pl-4 text-caption text-text">
            <li>Download the template CSV and the real brand/category slug reference.</li>
            <li>
              Fill one row per product. <strong>sku</strong> is the match key — an
              existing SKU updates that product; a new SKU creates one.
            </li>
            <li>
              <strong>price</strong> is what the customer pays (the special/selling
              price). <strong>compare_at_price</strong> is optional — the higher
              “regular” price shown struck through.
            </li>
            <li>
              <strong>brand</strong> and <strong>category</strong> must be real
              slugs from the reference file, not names.
            </li>
            <li>
              Variants, colors, attributes, and multiple images aren&apos;t
              supported by bulk import yet — add those on a product&apos;s own
              edit page after import.
            </li>
            <li>Upload the filled CSV below — every row is validated and saved for real.</li>
          </ol>
        </Alert>

        <Button
          type="button"
          onClick={handleDownload}
          className="min-h-10 gap-2 bg-violet-600 px-4 hover:bg-violet-700"
        >
          <Download className="size-4" aria-hidden />
          Download CSV template + slug reference
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-neutral-800">Upload product file</h2>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex gap-0">
            <Input
              readOnly
              value={file?.name ?? "Choose file"}
              className={cn(adminFormControlClass, "rounded-r-none text-neutral-500")}
              aria-label="Selected CSV file"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-9 shrink-0 items-center rounded-r-md border border-l-0 border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Browse
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="min-h-10 gap-2 bg-violet-600 px-4 hover:bg-violet-700 disabled:opacity-60"
          >
            <Upload className="size-4" aria-hidden />
            {pending ? "Importing…" : "Upload CSV"}
          </Button>
        </form>
      </section>

      {results ? (
        <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-neutral-800">Import results</h2>
            {summary ? (
              <div className="flex gap-2">
                <Badge tone="stock">{summary.created} created</Badge>
                <Badge tone="warranty">{summary.updated} updated</Badge>
                {summary.failed > 0 ? (
                  <Badge tone="sale">{summary.failed} failed</Badge>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeader className="w-16">Row</TableHeader>
                  <TableHeader>SKU</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Error</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row) => (
                  <TableRow key={row.row}>
                    <TableCell className="tabular-nums text-neutral-500">{row.row}</TableCell>
                    <TableCell className="font-mono text-xs">{row.sku || "—"}</TableCell>
                    <TableCell>{row.name || "—"}</TableCell>
                    <TableCell>
                      {row.status === "created" ? (
                        <Badge tone="stock">Created</Badge>
                      ) : row.status === "updated" ? (
                        <Badge tone="warranty">Updated</Badge>
                      ) : (
                        <Badge tone="sale">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-red-600">{row.error ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
