import type { Metadata } from "next";
import { AdminReviewList } from "@/features/admin/reviews/admin-review-list";
import { loadAdminReviewList } from "@/lib/admin/load-reviews";
import {
  parseAdminReviewListParams,
  type AdminReviewSearchParams,
} from "@/lib/admin/review-list-params";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Reviews",
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<AdminReviewSearchParams>;
}) {
  const session = await requireStaffSession();
  const raw = await searchParams;
  const params = parseAdminReviewListParams(raw);
  const data = await loadAdminReviewList(params);
  return (
    <AdminReviewList
      data={data}
      canAdd={hasPermission(session, "reviews.add")}
      canDelete={hasPermission(session, "reviews.delete")}
    />
  );
}
