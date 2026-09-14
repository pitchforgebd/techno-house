import type { Metadata } from "next";
import { AdminStudioPagesList } from "@/features/admin/design-studio/admin-studio-cms-pages";
import { getAdminContentPages } from "@/lib/content/pages";

export const metadata: Metadata = {
  title: "Pages · Design Studio",
};

export default async function DesignStudioPagesRoute() {
  const pages = await getAdminContentPages();
  return <AdminStudioPagesList pages={pages} />;
}
