import type { Metadata } from "next";
import { AdminNotificationHistoryPage } from "@/features/admin/marketing/admin-notification-pages";
import { listAdminCustomHistory } from "@/lib/notifications/inbox";

export const metadata: Metadata = { title: "Notification history" };

export default async function Page() {
  const items = await listAdminCustomHistory();
  return <AdminNotificationHistoryPage items={items} />;
}
