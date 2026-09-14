import type { Metadata } from "next";
import { AdminCustomScriptPage } from "@/features/admin/analytics/admin-analytics-nexa-pages";
import { getAdminCustomScripts } from "@/lib/analytics/custom-scripts";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = { title: "Custom Scripts" };

export default async function Page() {
  const session = await requireStaffSession();
  const scripts = await getAdminCustomScripts();
  return (
    <AdminCustomScriptPage
      headerScript={scripts.headerScript}
      footerScript={scripts.footerScript}
      canManage={hasPermission(session, "custom_scripts.manage")}
    />
  );
}
