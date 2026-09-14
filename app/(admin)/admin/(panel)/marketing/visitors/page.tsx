import type { Metadata } from "next";
import { AdminVisitorWidgetSettingsPage } from "@/features/admin/marketing/admin-visitor-widget-settings";
import { getVisitorWidgetSettings } from "@/lib/marketing/visitor-widget-settings";

export const metadata: Metadata = { title: "Custom Visitors" };

export default async function AdminVisitorsPage() {
  const settings = await getVisitorWidgetSettings();
  return <AdminVisitorWidgetSettingsPage settings={settings} />;
}
