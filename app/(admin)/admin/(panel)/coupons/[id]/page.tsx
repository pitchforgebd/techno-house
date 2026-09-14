import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCouponForm } from "@/features/admin/marketing/admin-coupon-form";
import { getAdminCouponById } from "@/lib/admin/load-marketing";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const coupon = await getAdminCouponById(id);
  return {
    title: coupon ? coupon.code : "Coupon not found",
  };
}

export default async function AdminCouponDetailPage({ params }: Props) {
  const { id } = await params;
  const coupon = await getAdminCouponById(id);
  if (!coupon) {
    notFound();
  }
  return <AdminCouponForm coupon={coupon} />;
}
