import type { Metadata } from "next";
import { AdminNotificationTypesPage } from "@/features/admin/marketing/admin-notification-pages";
import { listNotificationTypes } from "@/lib/notifications/type-settings";

export const metadata: Metadata = { title: "Notification types" };

export default async function Page() {
  const types = await listNotificationTypes();
  return <AdminNotificationTypesPage types={types} />;
}
