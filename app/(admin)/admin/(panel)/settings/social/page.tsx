import type { Metadata } from "next";
import { AdminSocialSettings } from "@/features/admin/settings/admin-social-settings";
import { getAdminSocialLoginConfigs } from "@/lib/social/login-config";
import { publicOrigin } from "@/lib/seo/public-origin";

export const metadata: Metadata = {
  title: "Social Media Logins",
};

export default async function AdminSocialSettingsPage() {
  const configs = await getAdminSocialLoginConfigs();
  return <AdminSocialSettings configs={configs} origin={publicOrigin()} />;
}
