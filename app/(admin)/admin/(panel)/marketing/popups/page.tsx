import type { Metadata } from "next";
import { AdminDynamicPopupsPage } from "@/features/admin/marketing/admin-dynamic-popups";
import { listAdminPopups } from "@/lib/marketing/popups";

export const metadata: Metadata = { title: "Dynamic Popups" };

export default async function AdminPopupsPage() {
  const rows = await listAdminPopups();
  return <AdminDynamicPopupsPage rows={rows} />;
}
