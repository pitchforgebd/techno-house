import type { Metadata } from "next";
import { AdminEmailTemplatesNexa } from "@/features/admin/marketing/admin-email-templates-nexa";
import { listAdminEmailTemplates } from "@/lib/mail/templates";

export const metadata: Metadata = { title: "Email Templates" };

export default async function AdminEmailTemplatesPage() {
  const rows = await listAdminEmailTemplates();
  return <AdminEmailTemplatesNexa rows={rows} />;
}
