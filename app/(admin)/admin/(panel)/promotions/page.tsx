import type { Metadata } from "next";
import { AdminPromotionOffersHub } from "@/features/admin/marketing/admin-promotion-hub";
import { loadPromotionOffersHub } from "@/lib/admin/load-promotions-offers";

export const metadata: Metadata = {
  title: "Promotion & Offers",
};

export default async function AdminPromotionsPage() {
  const snapshot = await loadPromotionOffersHub();
  return <AdminPromotionOffersHub snapshot={snapshot} />;
}
