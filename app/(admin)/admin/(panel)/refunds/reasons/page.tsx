import type { Metadata } from "next";
import { AdminRefundReasonList } from "@/features/admin/refunds/admin-refund-reason-list";
import { listAdminRefundReasons } from "@/lib/refunds/settings";

export const metadata: Metadata = {
  title: "Refund reasons",
};

export default async function AdminRefundReasonsPage() {
  const initialReasons = await listAdminRefundReasons();
  return <AdminRefundReasonList initialReasons={initialReasons} />;
}
