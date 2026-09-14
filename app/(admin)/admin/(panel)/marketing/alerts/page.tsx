import type { Metadata } from "next";
import { AdminCustomAlertsPage } from "@/features/admin/marketing/admin-custom-alerts";
import { listAdminAlerts } from "@/lib/marketing/alerts";

export const metadata: Metadata = { title: "Custom Alerts" };

export default async function AdminAlertsPage() {
  const rows = await listAdminAlerts();
  return <AdminCustomAlertsPage rows={rows} />;
}
