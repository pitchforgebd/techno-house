import type { Metadata } from "next";
import { AdminPickupPointsSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Pickup Points",
};

export default async function AdminPickupPointsPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminPickupPointsSettings settings={settings} />;
}
