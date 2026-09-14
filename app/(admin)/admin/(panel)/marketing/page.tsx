import type { Metadata } from "next";
import { AdminMarketingHub } from "@/features/admin/marketing/admin-marketing-hub";

export const metadata: Metadata = {
  title: "Marketing",
};

export default function AdminMarketingPage() {
  return <AdminMarketingHub />;
}
