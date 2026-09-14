import type { Metadata } from "next";
import { AdminSmsCampaigns } from "@/features/admin/marketing/admin-sms-campaigns";
import { listAdminSmsCampaigns } from "@/lib/sms/campaigns";

export const metadata: Metadata = { title: "Bulk SMS" };

export default async function AdminBulkSmsPage() {
  const campaigns = await listAdminSmsCampaigns();
  return <AdminSmsCampaigns campaigns={campaigns} />;
}
