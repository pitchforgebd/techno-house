import { redirect } from "next/navigation";

export default function AdminNotificationsIndexPage() {
  redirect("/admin/notifications/types");
}
