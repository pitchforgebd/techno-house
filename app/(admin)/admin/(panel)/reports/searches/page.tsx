import type { Metadata } from "next";
import { AdminUserSearchReport } from "@/features/admin/reports/admin-search-wallet-reports";
import { loadUserSearches } from "@/lib/admin/load-report-center";

export const metadata: Metadata = {
  title: "User Search Report",
};

export default async function Page() {
  const rows = await loadUserSearches();
  return <AdminUserSearchReport rows={rows} />;
}
