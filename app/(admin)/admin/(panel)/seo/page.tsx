import type { Metadata } from "next";
import { AdminGlobalSeoPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminSeoConfig } from "@/lib/seo/config";
import { getHomeSeoHtml } from "@/lib/seo/home-content";

export const metadata: Metadata = { title: "Global SEO" };

export default async function Page() {
  const [config, homeContentHtml] = await Promise.all([
    getAdminSeoConfig(),
    getHomeSeoHtml(),
  ]);
  return (
    <AdminGlobalSeoPage config={config} homeContentHtml={homeContentHtml} />
  );
}
