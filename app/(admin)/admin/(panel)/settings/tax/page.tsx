import type { Metadata } from "next";
import { AdminTaxSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Vat, TAX & Other Charges",
};

export default async function AdminTaxSettingsPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminTaxSettings settings={settings} />;
}
