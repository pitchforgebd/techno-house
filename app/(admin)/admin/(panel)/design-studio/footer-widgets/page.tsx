import type { Metadata } from "next";
import { AdminStudioFooterWidgetsPage } from "@/features/admin/design-studio/admin-footer-widgets-page";
import { getAdminBusinessSettings } from "@/lib/business/config";
import { getFooterWidgetsConfig } from "@/lib/content/footer-settings";

export const metadata: Metadata = {
  title: "Footer widgets · Design Studio",
};

export default async function DesignStudioFooterWidgetsRoute() {
  const [settings, footer] = await Promise.all([
    getAdminBusinessSettings(),
    getFooterWidgetsConfig(),
  ]);
  return (
    <AdminStudioFooterWidgetsPage
      contact={{
        phone: settings.phone,
        supportEmail: settings.supportEmail,
        address: settings.address,
      }}
      initialConfig={footer}
    />
  );
}
