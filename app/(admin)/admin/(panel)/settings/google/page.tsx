import type { Metadata } from "next";
import { AdminGoogleHub } from "@/features/admin/settings/admin-google-hub";

export const metadata: Metadata = {
  title: "Google",
};

export default function AdminGoogleSettingsPage() {
  return <AdminGoogleHub />;
}
