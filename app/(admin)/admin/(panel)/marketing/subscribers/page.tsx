import type { Metadata } from "next";
import { AdminSubscriberList } from "@/features/admin/marketing/admin-subscriber-list";
import { listAdminSubscribers } from "@/lib/content/newsletter";

export const metadata: Metadata = { title: "Subscribers" };

export default async function AdminSubscribersPage() {
  const subscribers = await listAdminSubscribers();
  return (
    <AdminSubscriberList
      title="Subscribers"
      description="Email newsletter opt-ins. SMS numbers stay mock until OTP/SMS work."
      subscribers={subscribers}
    />
  );
}
