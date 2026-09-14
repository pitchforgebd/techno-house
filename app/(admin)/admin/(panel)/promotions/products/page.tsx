import type { Metadata } from "next";
import {
  assignPromotionalProductsAction,
  bulkRemovePromotionalProductsAction,
  removePromotionalProductAction,
  setPromotionalProductFlagAction,
} from "@/features/admin/promotions/promotion-actions";
import { AdminPromoProductChannelList } from "@/features/admin/marketing/admin-promo-product-channel-list";
import {
  loadPromoCatalogProducts,
  loadPromotionalAssignedProducts,
} from "@/lib/admin/load-promotions-offers";

export const metadata: Metadata = {
  title: "Promotional Products",
};

export default async function AdminPromotionalProductsPage() {
  const [assigned, catalog] = await Promise.all([
    loadPromotionalAssignedProducts(),
    loadPromoCatalogProducts(),
  ]);
  const categories = Array.from(
    new Map(
      catalog.map((p) => [p.categorySlug, { slug: p.categorySlug, name: p.categoryName }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminPromoProductChannelList
      title="Promotional Products"
      tabLabel="Promotional Product List"
      addLabel="Promotional Products"
      pickerTitle="Add Product In Promotional"
      emptyTitle="No products found"
      assigned={assigned}
      catalog={catalog}
      categories={categories}
      showTodaysDealToggle
      persist={{
        assign: assignPromotionalProductsAction,
        remove: removePromotionalProductAction,
        bulkRemove: bulkRemovePromotionalProductsAction,
        setFlag: setPromotionalProductFlagAction,
      }}
    />
  );
}
