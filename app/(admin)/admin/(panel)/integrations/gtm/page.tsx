import type { Metadata } from "next";
import { AdminGtmSettingsPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminAnalyticsConfig } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Google Tag Manager" };

export default async function Page() {
  const config = await getAdminAnalyticsConfig("GTM");
  return <AdminGtmSettingsPage config={config} />;
}
