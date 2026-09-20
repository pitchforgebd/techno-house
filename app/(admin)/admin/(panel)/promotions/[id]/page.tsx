import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPromotionDetail } from "@/features/admin/marketing/admin-promotion-detail";
import {
  assignPromotionProductsAction,
  bulkRemovePromotionProductsAction,
  removePromotionProductAction,
} from "@/features/admin/promotions/promotion-actions";
import { getAdminPromotionById } from "@/lib/admin/load-marketing";
import {
  loadPromoCatalogProducts,
  loadPromotionAssignedProducts,
} from "@/lib/admin/load-promotions-offers";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const promotion = await getAdminPromotionById(id);
  return {
    title: promotion ? promotion.name : "Promotion not found",
  };
}

export default async function AdminPromotionDetailPage({ params }: Props) {
  const { id } = await params;
  const promotion = await getAdminPromotionById(id);
  if (!promotion) {
    notFound();
  }

  const [assignedProducts, catalogProducts] = await Promise.all([
    loadPromotionAssignedProducts(id),
    loadPromoCatalogProducts(),
  ]);
  const categories = Array.from(
    new Map(
      catalogProducts.map((p) => [
        p.categorySlug,
        { slug: p.categorySlug, name: p.categoryName },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminPromotionDetail
      promotion={promotion}
      products={{
        assignedProducts,
        catalogProducts,
        categories,
        productActions: {
          assign: assignPromotionProductsAction.bind(null, id),
          remove: removePromotionProductAction.bind(null, id),
          bulkRemove: bulkRemovePromotionProductsAction.bind(null, id),
        },
      }}
    />
  );
}
