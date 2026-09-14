import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminRoleForm } from "@/features/admin/staff/admin-role-form";
import { hasPermission } from "@/lib/auth/permissions";
import { getStaffRoleByKey } from "@/lib/auth/staff-roles";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const role = await getStaffRoleByKey(id);
  return {
    title: role ? `Edit · ${role.name}` : "Role not found",
  };
}

export default async function AdminStaffRoleDetailPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const role = await getStaffRoleByKey(id);
  if (!role) {
    notFound();
  }
  return (
    <AdminRoleForm
      mode="edit"
      role={{
        key: role.key,
        name: role.name,
        permissionIds: role.permissionIds,
      }}
      canManage={hasPermission(session, "roles.manage")}
    />
  );
}
