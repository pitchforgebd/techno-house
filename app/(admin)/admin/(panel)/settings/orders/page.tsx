import type { Metadata } from "next";
import { AdminOrderConfigurationSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Order Configuration",
};

export default async function AdminOrderConfigurationPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminOrderConfigurationSettings settings={settings} />;
}
