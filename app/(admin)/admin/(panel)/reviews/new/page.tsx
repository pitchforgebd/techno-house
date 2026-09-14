import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminCustomReviewForm } from "@/features/admin/reviews/admin-custom-review-form";
import { loadAdminReviewFormOptions } from "@/lib/admin/load-reviews";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add custom review",
};

export default async function AdminNewCustomReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string | string[] }>;
}) {
  const session = await requireStaffSession();
  if (!hasPermission(session, "reviews.add")) {
    redirect("/admin/reviews");
  }
  const raw = await searchParams;
  const productRaw = raw.product;
  const initialProductSlug = Array.isArray(productRaw)
    ? productRaw[0]
    : productRaw;
  const options = await loadAdminReviewFormOptions();

  return (
    <AdminCustomReviewForm
      categories={options.categories}
      products={options.products}
      initialProductSlug={initialProductSlug}
      canSave
    />
  );
}
