import type { Metadata } from "next";
import { AdminRefundSettings } from "@/features/admin/refunds/admin-refund-settings";
import {
  getRefundPolicySettings,
  listAdminRefundReasons,
} from "@/lib/refunds/settings";

export const metadata: Metadata = {
  title: "Refund settings",
};

export default async function AdminRefundSettingsPage() {
  const [settings, reasons] = await Promise.all([
    getRefundPolicySettings(),
    listAdminRefundReasons(),
  ]);
  return (
    <AdminRefundSettings
      initialSettings={settings}
      initialReasons={reasons}
    />
  );
}
