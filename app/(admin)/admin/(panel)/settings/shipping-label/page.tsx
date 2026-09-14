import type { Metadata } from "next";
import { AdminShippingLabelSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Shipping Label",
};

export default async function AdminShippingLabelPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminShippingLabelSettings settings={settings} />;
}
