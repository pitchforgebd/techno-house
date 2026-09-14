import type { Metadata } from "next";
import { AdminBannersPage } from "@/features/admin/design-studio/admin-banners-page";
import { getAdminHomeBanners } from "@/lib/design/home-banners";

export const metadata: Metadata = {
  title: "Banners & sliders · Design Studio",
};

export default async function DesignStudioBannersRoute() {
  const banners = await getAdminHomeBanners();
  return <AdminBannersPage banners={banners} />;
}
