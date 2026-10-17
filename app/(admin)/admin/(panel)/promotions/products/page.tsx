import type { Metadata } from "next";
import {
  assignPromotionalProductsAction,
  assignPromotionProductsAction,
  bulkRemovePromotionalProductsAction,
  removePromotionalProductAction,
  setPromotionalProductFlagAction,
} from "@/features/admin/promotions/promotion-actions";
import { AdminPromoProductsPage } from "@/features/admin/marketing/admin-promo-products-page";
import {
  loadPromoCatalogProducts,
  loadPromotionalAssignedProducts,
} from "@/lib/admin/load-promotions-offers";
import { listAssignablePromotions } from "@/lib/marketing/promotions";

export const metadata: Metadata = {
  title: "Promotional Products",
};

export default async function AdminPromotionalProductsPage() {
  const [assigned, catalog, promotions] = await Promise.all([
    loadPromotionalAssignedProducts(),
    loadPromoCatalogProducts(),
    listAssignablePromotions(),
  ]);
  const categories = Array.from(
    new Map(
      catalog.map((p) => [p.categorySlug, { slug: p.categorySlug, name: p.categoryName }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminPromoProductsPage
      assigned={assigned}
      catalog={catalog}
      categories={categories}
      promotions={promotions}
      persist={{
        assign: assignPromotionalProductsAction,
        remove: removePromotionalProductAction,
        bulkRemove: bulkRemovePromotionalProductsAction,
        setFlag: setPromotionalProductFlagAction,
      }}
      assignToPromotion={assignPromotionProductsAction}
    />
  );
}
