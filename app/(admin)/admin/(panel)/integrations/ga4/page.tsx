import type { Metadata } from "next";
import { AdminGa4SettingsPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminAnalyticsConfig } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Google Analytics (GA4)" };

export default async function Page() {
  const config = await getAdminAnalyticsConfig("GA4");
  return <AdminGa4SettingsPage config={config} />;
}
