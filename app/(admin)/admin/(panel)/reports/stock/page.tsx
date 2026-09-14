import type { Metadata } from "next";
import { AdminCategoryReportTable } from "@/features/admin/reports/admin-report-center-ui";
import { loadProductStockRows } from "@/lib/admin/load-report-center";
import type { AnalyticsSearchParams } from "@/lib/admin/analytics-list-params";

export const metadata: Metadata = {
  title: "Product Stock Report",
};

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const raw = await searchParams;
  const category = first(raw.category).trim();
  const page = Number.parseInt(first(raw.page), 10);
  const { rows, categories } = await loadProductStockRows(category);
  return (
    <AdminCategoryReportTable
      title="Product wise stock report"
      valueHeader="Available Stock"
      rows={rows}
      categories={categories}
      categorySlug={category}
      actionPath="/admin/reports/stock"
      page={Number.isFinite(page) && page > 0 ? page : 1}
      exportFilePrefix="stock-report"
    />
  );
}
