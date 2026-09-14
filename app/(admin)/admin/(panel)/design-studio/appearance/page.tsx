import type { Metadata } from "next";
import { AdminStudioAppearancePage } from "@/features/admin/design-studio/admin-design-studio-pages";
import { getAdminThemeSettings } from "@/lib/design/theme-settings";

export const metadata: Metadata = {
  title: "Appearance · Design Studio",
};

export default async function DesignStudioAppearanceRoute() {
  const settings = await getAdminThemeSettings();
  return <AdminStudioAppearancePage settings={settings} />;
}
