import type { Metadata } from "next";
import { AdminCouponList } from "@/features/admin/marketing/admin-coupon-list";
import { loadAdminCoupons } from "@/lib/admin/load-marketing";
import {
  parseCouponListParams,
  type MarketingSearchParams,
} from "@/lib/admin/marketing-list-params";

export const metadata: Metadata = {
  title: "Coupons",
};

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<MarketingSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseCouponListParams(raw);
  const data = await loadAdminCoupons(params);
  return <AdminCouponList data={data} />;
}
