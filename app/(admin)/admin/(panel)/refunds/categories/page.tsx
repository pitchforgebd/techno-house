import type { Metadata } from "next";
import { AdminCategoryRefundList } from "@/features/admin/refunds/admin-category-refund-list";
import { categoryRepository } from "@/lib/data";
import { getRefundPolicySettings } from "@/lib/refunds/settings";

export const metadata: Metadata = {
  title: "Category refunds",
};

export default async function AdminCategoryRefundsPage() {
  const [categories, settings] = await Promise.all([
    categoryRepository.list(),
    getRefundPolicySettings(),
  ]);
  return (
    <AdminCategoryRefundList
      categories={categories}
      refundType={settings.refundType}
      initialDays={settings.categoryDays}
    />
  );
}
