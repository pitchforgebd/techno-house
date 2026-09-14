import type { Metadata } from "next";
import { AdminNewsletterCampaigns } from "@/features/admin/marketing/admin-newsletter-campaigns";
import { AdminSubscriberList } from "@/features/admin/marketing/admin-subscriber-list";
import { listAdminCampaigns } from "@/lib/content/newsletter-campaigns";
import { listAdminSubscribers } from "@/lib/content/newsletter";

export const metadata: Metadata = { title: "Newsletter" };

export default async function AdminNewsletterPage() {
  const [subscribers, campaigns] = await Promise.all([
    listAdminSubscribers(),
    listAdminCampaigns(),
  ]);
  const subscribedCount = subscribers.filter((row) => row.status === "subscribed").length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Newsletter</h1>
        <p className="mt-1 text-body text-text-muted">
          Compose and send a real campaign to subscribed emails, and manage
          opt-ins below.
        </p>
      </div>
      <AdminNewsletterCampaigns campaigns={campaigns} subscribedCount={subscribedCount} />
      <AdminSubscriberList
        title="Newsletter subscribers"
        description="Email opt-ins."
        subscribers={subscribers}
      />
    </div>
  );
}
