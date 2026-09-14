import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminCategoryReportTable } from "@/features/admin/reports/admin-report-center-ui";
import { loadWishlistRows } from "@/lib/admin/load-report-center";
import type { AnalyticsSearchParams } from "@/lib/admin/analytics-list-params";

export const metadata: Metadata = {
  title: "Product Wish Report",
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
  const { rows, categories, available } = await loadWishlistRows(category);

  if (!available) {
    return (
      <div className="mx-auto max-w-[900px] space-y-5 pb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Product Wish Report
        </h1>
        <EmptyState
          title="Not available yet"
          description="The storefront wishlist is only saved in each visitor's browser today — it isn't synced to a customer account, so there's no real wishlist data in the database to report on. This report will show real numbers once wishlists are synced to accounts."
        />
      </div>
    );
  }

  return (
    <AdminCategoryReportTable
      title="Product Wish Report"
      valueHeader="Number of Wish"
      rows={rows}
      categories={categories}
      categorySlug={category}
      actionPath="/admin/reports/wishlist"
      page={Number.isFinite(page) && page > 0 ? page : 1}
      exportFilePrefix="wishlist-report"
    />
  );
}
