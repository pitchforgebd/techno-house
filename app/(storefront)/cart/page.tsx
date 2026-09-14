import type { Metadata } from "next";
import { CartView } from "@/features/cart/cart-view";
import { isFeatureFlagEnabled } from "@/lib/admin/feature-flags-config";
import { NO_INDEX } from "@/lib/seo/robots";

export const metadata: Metadata = {
  title: "Cart — Techno House",
  robots: NO_INDEX,
};

export default async function CartPage() {
  const couponsEnabled = await isFeatureFlagEnabled("coupons");
  return <CartView couponsEnabled={couponsEnabled} />;
}
