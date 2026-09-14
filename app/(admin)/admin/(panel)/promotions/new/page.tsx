import type { Metadata } from "next";
import { AdminPromotionDetail } from "@/features/admin/marketing/admin-promotion-detail";

export const metadata: Metadata = {
  title: "New promotion",
};

export default function AdminNewPromotionPage() {
  return <AdminPromotionDetail promotion={null} isNew />;
}
