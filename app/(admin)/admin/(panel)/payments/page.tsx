import type { Metadata } from "next";
import { AdminPaymentMethods } from "@/features/admin/payments/admin-payment-methods";
import { listAdminGatewayViews } from "@/lib/payments/gateway-settings";

export const metadata: Metadata = {
  title: "Payment Methods",
};

export default async function AdminPaymentsPage() {
  const initial = await listAdminGatewayViews();
  return <AdminPaymentMethods initial={initial} />;
}
