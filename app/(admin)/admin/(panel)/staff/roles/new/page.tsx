import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminRoleForm } from "@/features/admin/staff/admin-role-form";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add role",
};

export default async function AdminStaffRoleNewPage() {
  const session = await requireStaffSession();
  if (!hasPermission(session, "roles.manage")) {
    redirect("/admin/staff/roles");
  }
  return <AdminRoleForm mode="create" canManage />;
}
