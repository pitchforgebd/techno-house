import type { Metadata } from "next";
import { AdminStudioAdminNavbarPage } from "@/features/admin/design-studio/admin-design-studio-pages";
import { getAdminThemeSettings } from "@/lib/design/theme-settings";

export const metadata: Metadata = {
  title: "Admin navbar · Design Studio",
};

export default async function DesignStudioAdminNavbarRoute() {
  const settings = await getAdminThemeSettings();
  return <AdminStudioAdminNavbarPage settings={settings} />;
}
