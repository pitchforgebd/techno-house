import type { Metadata } from "next";
import { AdminStudioLogoPage } from "@/features/admin/design-studio/admin-design-studio-pages";
import { getAdminBusinessSettings } from "@/lib/business/config";

export const metadata: Metadata = {
  title: "Logo & favicon · Design Studio",
};

export default async function DesignStudioLogoRoute() {
  const settings = await getAdminBusinessSettings();
  return (
    <AdminStudioLogoPage
      settings={{
        logoSrc: settings.logoSrc,
        faviconSrc: settings.faviconSrc,
        logoHeightPx: settings.logoHeightPx,
      }}
    />
  );
}
