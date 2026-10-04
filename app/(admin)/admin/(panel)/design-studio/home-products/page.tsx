import type { Metadata } from "next";
import { AdminHomeProductsPage } from "@/features/admin/design-studio/admin-home-products-page";
import { getAdminHomeSection } from "@/lib/marketing/home-sections";

export const metadata: Metadata = {
  title: "Homepage products · Design Studio",
};

export default async function DesignStudioHomeProductsRoute() {
  const [featured, deals] = await Promise.all([
    getAdminHomeSection("featured"),
    getAdminHomeSection("deals"),
  ]);
  return <AdminHomeProductsPage featured={featured} deals={deals} />;
}
