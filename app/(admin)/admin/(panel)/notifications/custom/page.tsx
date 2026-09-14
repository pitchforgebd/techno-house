import type { Metadata } from "next";
import { AdminCustomNotificationsPage } from "@/features/admin/marketing/admin-notification-pages";

export const metadata: Metadata = { title: "Send Custom Notification" };

export default function Page() {
  return <AdminCustomNotificationsPage />;
}
