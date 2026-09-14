import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/features/admin/products/admin-product-form";
import {
  getAdminProductById,
  loadAdminProductFormOptions,
} from "@/lib/admin/load-products";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getAdminProductById(id);
  return {
    title: product ? `Edit ${product.name}` : "Product not found",
  };
}

export default async function AdminEditProductPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const [product, options] = await Promise.all([
    getAdminProductById(id),
    loadAdminProductFormOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <AdminProductForm
      mode="edit"
      product={product}
      categories={options.categories}
      brands={options.brands}
      attributes={options.attributes}
      units={options.units}
      warranties={options.warranties}
      notes={options.notes}
      labels={options.labels}
      canSave={hasPermission(session, "product.edit")}
    />
  );
}
