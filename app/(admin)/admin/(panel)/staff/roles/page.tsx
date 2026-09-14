import type { Metadata } from "next";
import { AdminRolesList } from "@/features/admin/staff/admin-roles-list";
import { hasPermission } from "@/lib/auth/permissions";
import { listStaffRoles } from "@/lib/auth/staff-roles";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Roles",
};

export default async function AdminStaffRolesPage() {
  const session = await requireStaffSession();
  const roles = await listStaffRoles();
  return (
    <AdminRolesList
      roles={roles}
      canManage={hasPermission(session, "roles.manage")}
    />
  );
}
