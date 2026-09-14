import type { Metadata } from "next";
import { AdminSaleAlertSettingsPage } from "@/features/admin/marketing/admin-custom-alerts";
import { getSaleAlertSettings, listPickableProducts } from "@/lib/marketing/sale-alerts";

export const metadata: Metadata = { title: "Custom Sale Alert" };

export default async function AdminSaleAlertsPage() {
  const [settings, pickableProducts] = await Promise.all([
    getSaleAlertSettings(),
    listPickableProducts(),
  ]);
  return (
    <AdminSaleAlertSettingsPage settings={settings} pickableProducts={pickableProducts} />
  );
}
