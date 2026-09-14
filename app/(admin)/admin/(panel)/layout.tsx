import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { ADMIN_PATH_HEADER } from "@/lib/auth/admin-path-header";
import { canAccessAdminPath } from "@/lib/auth/admin-route-permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";
import { getAdminNavTheme } from "@/lib/design/theme-settings";

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireStaffSession();
  const pathname = (await headers()).get(ADMIN_PATH_HEADER)?.trim() || "/admin";

  if (
    pathname !== "/admin/forbidden" &&
    !canAccessAdminPath(pathname, session.permissions)
  ) {
    redirect("/admin/forbidden");
  }

  const navTheme = await getAdminNavTheme();

  return <AdminShell navTheme={navTheme}>{children}</AdminShell>;
}
