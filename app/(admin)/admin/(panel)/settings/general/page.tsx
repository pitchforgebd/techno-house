import type { Metadata } from "next";
import { AdminGeneralSettingsForm } from "@/features/admin/settings/admin-business-sub-settings";
import { getAdminBusinessSettings } from "@/lib/business/config";

export const metadata: Metadata = {
  title: "General Settings",
};

export default async function AdminGeneralSettingsPage() {
  const settings = await getAdminBusinessSettings();
  return <AdminGeneralSettingsForm settings={settings} />;
}
