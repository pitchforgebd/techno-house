import type { Metadata } from "next";
import { AdminRefundReasonForm } from "@/features/admin/refunds/admin-refund-reason-form";

export const metadata: Metadata = {
  title: "Add refund reason",
};

export default function AdminNewRefundReasonPage() {
  return <AdminRefundReasonForm />;
}
