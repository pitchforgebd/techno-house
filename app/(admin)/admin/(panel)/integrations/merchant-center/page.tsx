import type { Metadata } from "next";
import { AdminMerchantCenterSettingsPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminMerchantConfig } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Google Merchant Center" };

export default async function Page() {
  const config = await getAdminMerchantConfig();
  return <AdminMerchantCenterSettingsPage config={config} />;
}
