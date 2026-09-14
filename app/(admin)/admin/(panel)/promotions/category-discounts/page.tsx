import type { Metadata } from "next";
import { AdminCategoryDiscounts } from "@/features/admin/marketing/admin-category-discounts";
import { loadCategoryDiscountRows } from "@/lib/admin/load-promotions-offers";

export const metadata: Metadata = {
  title: "Category discounts",
};

export default async function AdminCategoryDiscountsPage() {
  const rows = await loadCategoryDiscountRows();
  return <AdminCategoryDiscounts rows={rows} />;
}
