import type { Metadata } from "next";
import { AdminStudioAuthPage } from "@/features/admin/design-studio/admin-design-studio-pages";
import { getAdminThemeSettings } from "@/lib/design/theme-settings";

export const metadata: Metadata = {
  title: "Auth pages · Design Studio",
};

export default async function DesignStudioAuthRoute() {
  const settings = await getAdminThemeSettings();
  return <AdminStudioAuthPage settings={settings} />;
}
