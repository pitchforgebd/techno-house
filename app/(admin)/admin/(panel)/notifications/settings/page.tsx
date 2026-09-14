import type { Metadata } from "next";
import { AdminNotificationSettingsPage } from "@/features/admin/marketing/admin-notification-pages";
import { getNotificationSettings } from "@/lib/notifications/global-settings";

export const metadata: Metadata = { title: "Notification settings" };

export default async function Page() {
  const settings = await getNotificationSettings();
  return <AdminNotificationSettingsPage settings={settings} />;
}
