import type { Metadata } from "next";
import { AdminAuditLogView } from "@/features/admin/staff/admin-audit-log-view";
import { listAuditLogs } from "@/lib/auth/audit-log";

export const metadata: Metadata = {
  title: "Audit log",
};

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const raw = await searchParams;
  const page = Number.parseInt(raw.page ?? "1", 10);
  const data = await listAuditLogs({
    page: Number.isFinite(page) ? page : 1,
  });
  return <AdminAuditLogView data={data} />;
}
