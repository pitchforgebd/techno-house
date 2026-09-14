"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifySuccess } from "@/components/ui/feedback-provider";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildReportCsv(
  headers: string[],
  rows: (string | number)[][],
): string {
  const lines = [headers, ...rows].map((line) =>
    line.map((cell) => escapeCsv(String(cell))).join(","),
  );
  return `${lines.join("\n")}\n`;
}

/** Exports the full real row set client-side — never just the current page slice. */
export function ReportCsvExportButton({
  filename,
  headers,
  rows,
  label = "Download CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  function handleDownload() {
    const csv = buildReportCsv(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    notifySuccess({
      title: "CSV downloaded",
      description: `${rows.length} row${rows.length === 1 ? "" : "s"} exported.`,
    });
  }

  return (
    <Button
      type="button"
      onClick={handleDownload}
      disabled={rows.length === 0}
      className="h-9 gap-2 bg-neutral-800 px-3 text-sm hover:bg-neutral-900"
    >
      <Download className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
