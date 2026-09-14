import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminStaffForm } from "@/features/admin/staff/admin-staff-form";
import { hasPermission } from "@/lib/auth/permissions";
import { listStaffRoles } from "@/lib/auth/staff-roles";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Add staff",
};

export default async function AdminStaffNewPage() {
  const session = await requireStaffSession();
  if (!hasPermission(session, "staff.add")) {
    redirect("/admin/staff");
  }
  const roles = await listStaffRoles();
  return <AdminStaffForm mode="create" roles={roles} canManage />;
}
