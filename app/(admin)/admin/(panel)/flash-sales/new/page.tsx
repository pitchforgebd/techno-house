import type { Metadata } from "next";
import { AdminFlashSaleDetail } from "@/features/admin/marketing/admin-flash-sale-detail";
import { loadPromoCatalogProducts } from "@/lib/admin/load-promotions-offers";

export const metadata: Metadata = {
  title: "New flash deal",
};

export default async function AdminNewFlashSalePage() {
  const catalog = await loadPromoCatalogProducts();
  const categories = Array.from(
    new Map(
      catalog.map((p) => [
        p.categorySlug,
        { slug: p.categorySlug, name: p.categoryName },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AdminFlashSaleDetail
      flashSale={null}
      isNew
      catalog={catalog}
      categories={categories}
    />
  );
}
