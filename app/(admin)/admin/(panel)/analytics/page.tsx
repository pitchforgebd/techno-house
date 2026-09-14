import type { Metadata } from "next";
import { AdminMarketingAnalyticsHub } from "@/features/admin/analytics/admin-marketing-analytics-hub";

export const metadata: Metadata = {
  title: "Marketing Analytics",
};

export default function AdminAnalyticsPage() {
  return <AdminMarketingAnalyticsHub />;
}
