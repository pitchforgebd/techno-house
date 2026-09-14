import type { Metadata } from "next";
import { AdminMetaPixelSettingsPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminMetaConfig } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Meta Pixel" };

export default async function Page() {
  const config = await getAdminMetaConfig();
  return <AdminMetaPixelSettingsPage config={config} />;
}
