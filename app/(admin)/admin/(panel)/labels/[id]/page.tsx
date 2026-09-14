import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminLabelForm } from "@/features/admin/labels/admin-label-form";
import { loadAdminLabelById } from "@/lib/admin/load-labels";
import { productRepository } from "@/lib/data";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const label = await loadAdminLabelById(id);
  return {
    title: label ? `Edit ${label.text}` : "Edit custom label",
  };
}

export default async function AdminEditLabelPage({ params }: Props) {
  const { id } = await params;
  const label = await loadAdminLabelById(id);
  if (!label) {
    notFound();
  }

  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: "newest",
  });

  return (
    <AdminLabelForm
      mode="edit"
      initial={label}
      products={catalog.items}
    />
  );
}
