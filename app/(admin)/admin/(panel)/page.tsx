import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { loadAdminDashboard } from "@/lib/admin/load-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function AdminHomePage() {
  const data = await loadAdminDashboard();
  return <AdminDashboard data={data} />;
}
