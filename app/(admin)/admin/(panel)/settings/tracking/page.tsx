import type { Metadata } from "next";
import { AdminOrderTrackingSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Order Tracking",
};

export default async function AdminOrderTrackingPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminOrderTrackingSettings settings={settings} />;
}
