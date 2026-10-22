import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/features/admin/products/admin-product-form";
import {
  getAdminProductById,
  loadAdminProductFormOptions,
} from "@/lib/admin/load-products";
import { getAdminProductFormOrder } from "@/lib/admin/product-form-layout";
import { getAdminB2BProductTerms } from "@/lib/b2b/product-terms";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";
import { listAssignablePromotions } from "@/lib/marketing/promotions";
import { listPromotionIdsForProduct } from "@/lib/marketing/promotion-products";

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
  const [product, options, b2bTerms, promotions, assignedPromotionIds, sectionOrder] =
    await Promise.all([
      getAdminProductById(id),
      loadAdminProductFormOptions(),
      getAdminB2BProductTerms(id),
      listAssignablePromotions(),
      listPromotionIdsForProduct(id),
      getAdminProductFormOrder(),
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
      b2bTerms={b2bTerms}
      promotions={promotions}
      assignedPromotionIds={assignedPromotionIds}
      canManagePromotions={hasPermission(session, "promotion.manage")}
      sectionOrder={sectionOrder}
    />
  );
}
