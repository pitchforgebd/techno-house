import type { Metadata } from "next";
import { AdminGoogleRecaptchaSettings } from "@/features/admin/settings/admin-google-recaptcha";
import { getAdminRecaptchaConfig } from "@/lib/social/recaptcha-config";

export const metadata: Metadata = {
  title: "Google reCAPTCHA",
};

export default async function AdminGoogleRecaptchaPage() {
  const config = await getAdminRecaptchaConfig();
  return <AdminGoogleRecaptchaSettings config={config} />;
}
