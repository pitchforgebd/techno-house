import type { Metadata } from "next";
import { AdminThermalPrinterSettings } from "@/features/admin/settings/admin-business-sub-settings";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";

export const metadata: Metadata = {
  title: "Thermal Printer Settings",
};

export default async function AdminThermalPrinterPage() {
  const settings = await getStoreOperationsSettings();
  return <AdminThermalPrinterSettings settings={settings} />;
}
