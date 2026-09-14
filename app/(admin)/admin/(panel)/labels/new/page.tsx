import type { Metadata } from "next";
import { AdminLabelForm } from "@/features/admin/labels/admin-label-form";
import { productRepository } from "@/lib/data";

export const metadata: Metadata = {
  title: "Add custom label",
};

export default async function AdminNewLabelPage() {
  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: "newest",
  });

  return <AdminLabelForm mode="create" products={catalog.items} />;
}
