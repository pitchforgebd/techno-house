import type { Metadata } from "next";
import { AdminBusinessSettingsHub } from "@/features/admin/settings/admin-business-settings-hub";

export const metadata: Metadata = {
  title: "Business Settings",
};

export default function AdminSettingsPage() {
  return <AdminBusinessSettingsHub />;
}
