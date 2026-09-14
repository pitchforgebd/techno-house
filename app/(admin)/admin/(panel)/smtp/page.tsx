import type { Metadata } from "next";
import { AdminSmtpSettings } from "@/features/admin/settings/admin-smtp-settings";
import { getAdminSmtpConfig } from "@/lib/smtp/config";

export const metadata: Metadata = {
  title: "SMTP Settings",
};

export default async function AdminSmtpPage() {
  const config = await getAdminSmtpConfig();
  return <AdminSmtpSettings config={config} />;
}
