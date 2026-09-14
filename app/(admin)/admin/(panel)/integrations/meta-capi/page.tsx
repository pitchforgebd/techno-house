import type { Metadata } from "next";
import { AdminMetaCapiSettingsPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminMetaConfig } from "@/lib/analytics/config";
import { isMetaCapiConfigured } from "@/lib/analytics/meta-capi";

export const metadata: Metadata = { title: "Meta Conversion API" };

export default async function Page() {
  const [config, hasAccessToken] = await Promise.all([
    getAdminMetaConfig(),
    isMetaCapiConfigured(),
  ]);
  return <AdminMetaCapiSettingsPage config={config} live={hasAccessToken} />;
}
