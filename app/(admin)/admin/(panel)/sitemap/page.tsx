import type { Metadata } from "next";
import { AdminSitemapGeneratorPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getSitemapAdminSummary } from "@/lib/seo/sitemap";

export const metadata: Metadata = { title: "Sitemap Generator" };

export default async function Page() {
  const summary = await getSitemapAdminSummary();
  return (
    <AdminSitemapGeneratorPage
      urlCount={summary.urlCount}
      updatedAt={summary.updatedAt}
    />
  );
}
