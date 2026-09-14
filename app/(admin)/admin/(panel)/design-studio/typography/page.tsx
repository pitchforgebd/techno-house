import type { Metadata } from "next";
import { AdminStudioTypographyPage } from "@/features/admin/design-studio/admin-design-studio-pages";
import { getAdminThemeSettings } from "@/lib/design/theme-settings";

export const metadata: Metadata = {
  title: "Typography · Design Studio",
};

export default async function DesignStudioTypographyRoute() {
  const settings = await getAdminThemeSettings();
  return <AdminStudioTypographyPage settings={settings} />;
}
