import type { Metadata } from "next";
import { AdminPcBuilderSettings } from "@/features/admin/pc-builder/admin-pc-builder-settings";
import { getAdminPcBuilderSettings } from "@/lib/pc-builder/settings";

export const metadata: Metadata = {
  title: "PC Builder",
};

export default async function AdminPcBuilderPage() {
  const settings = await getAdminPcBuilderSettings();
  return <AdminPcBuilderSettings settings={settings} />;
}
