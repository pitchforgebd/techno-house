import type { Metadata } from "next";
import {
  assignTodaysDealProductsAction,
  bulkRemoveTodaysDealProductsAction,
  removeTodaysDealProductAction,
  setTodaysDealProductFlagAction,
} from "@/features/admin/deals/deal-actions";
import { AdminPromoProductChannelList } from "@/features/admin/marketing/admin-promo-product-channel-list";
import {
  loadPromoCatalogProducts,
  loadTodaysDealProducts,
} from "@/lib/admin/load-promotions-offers";

export const metadata: Metadata = {
  title: "Today's Deal",
};

export default async function AdminDealsPage() {
  const [assigned, catalog] = await Promise.all([
    loadTodaysDealProducts(),
    loadPromoCatalogProducts(),
  ]);
  const categories = Array.from(
    new Map(
      catalog.map((p) => [
        p.categorySlug,
        { slug: p.categorySlug, name: p.categoryName },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminPromoProductChannelList
      title="Todays Deal Products"
      tabLabel="Todays Deal Product List"
      addLabel="Todays Deal Products"
      pickerTitle="Add Product In Todays Deal"
      emptyTitle="No products found"
      assigned={assigned}
      catalog={catalog}
      categories={categories}
      showTodaysDealToggle
      persist={{
        assign: assignTodaysDealProductsAction,
        remove: removeTodaysDealProductAction,
        bulkRemove: bulkRemoveTodaysDealProductsAction,
        setFlag: setTodaysDealProductFlagAction,
      }}
    />
  );
}
