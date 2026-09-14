import type { Metadata } from "next";
import { AdminCouponForm } from "@/features/admin/marketing/admin-coupon-form";

export const metadata: Metadata = {
  title: "New coupon",
};

export default function AdminNewCouponPage() {
  return <AdminCouponForm coupon={null} isNew />;
}
