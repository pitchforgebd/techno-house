import type { Metadata } from "next";
import { AdminEmiSettings } from "@/features/admin/payments/admin-emi-settings";
import { getEmiConfig } from "@/lib/payments/emi-config";

export const metadata: Metadata = {
  title: "EMI Settings",
};

export default async function AdminEmiSettingsPage() {
  const initial = await getEmiConfig();
  return <AdminEmiSettings initial={initial} />;
}
