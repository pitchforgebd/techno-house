import type { Metadata } from "next";
import { AdminDealDetail } from "@/features/admin/marketing/admin-deal-detail";

export const metadata: Metadata = {
  title: "New deal",
};

export default function AdminNewDealPage() {
  return <AdminDealDetail deal={null} isNew />;
}
