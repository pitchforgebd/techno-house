import type { Metadata } from "next";
import { AdminOfflinePayments } from "@/features/admin/payments/admin-offline-payments";
import { getOfflinePaymentConfig } from "@/lib/payments/offline-config";

export const metadata: Metadata = {
  title: "Offline payments",
};

export default async function AdminOfflinePaymentsPage() {
  const initial = await getOfflinePaymentConfig();
  return <AdminOfflinePayments initial={initial} />;
}
