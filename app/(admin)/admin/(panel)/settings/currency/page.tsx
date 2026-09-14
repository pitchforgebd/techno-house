import type { Metadata } from "next";
import { AdminCurrencySettings } from "@/features/admin/settings/admin-currency-settings";
import { getCurrencyFormat } from "@/lib/business/currency-format";

export const metadata: Metadata = {
  title: "Currency",
};

export default async function AdminCurrencySettingsPage() {
  const initial = await getCurrencyFormat();
  return <AdminCurrencySettings initial={initial} />;
}
