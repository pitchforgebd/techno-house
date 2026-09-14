import { AdminStaffForm } from "@/features/admin/staff/admin-staff-form";
import type { AdminStaffMember } from "@/lib/admin/staff-types";
import type { StaffRoleRecord } from "@/lib/auth/staff-roles";

export function AdminStaffDetail({
  member,
  roles,
  canManage,
  isSelf,
}: {
  member: AdminStaffMember;
  roles: StaffRoleRecord[];
  canManage: boolean;
  isSelf: boolean;
}) {
  return (
    <AdminStaffForm
      mode="edit"
      member={member}
      roles={roles}
      canManage={canManage}
      isSelf={isSelf}
    />
  );
}
