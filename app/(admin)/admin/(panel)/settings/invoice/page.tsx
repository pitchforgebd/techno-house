import type { Metadata } from "next";
import { AdminInvoiceSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Invoice Settings",
};

export default async function AdminInvoiceSettingsPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminInvoiceSettings settings={settings} />;
}
