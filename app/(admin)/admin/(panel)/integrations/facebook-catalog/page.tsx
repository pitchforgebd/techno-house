import type { Metadata } from "next";
import { AdminFacebookCatalogSettingsPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminMetaConfig } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Facebook Catalog" };

export default async function Page() {
  const config = await getAdminMetaConfig();
  return <AdminFacebookCatalogSettingsPage config={config} />;
}
