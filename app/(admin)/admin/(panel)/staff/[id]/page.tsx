import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminStaffDetail } from "@/features/admin/staff/admin-staff-detail";
import { getAdminStaffById } from "@/lib/admin/load-settings";
import { hasPermission } from "@/lib/auth/permissions";
import { listStaffRoles } from "@/lib/auth/staff-roles";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const member = await getAdminStaffById(id);
  return {
    title: member ? member.fullName : "Staff not found",
  };
}

export default async function AdminStaffDetailPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const member = await getAdminStaffById(id);
  if (!member) {
    notFound();
  }
  const roles = await listStaffRoles();
  return (
    <AdminStaffDetail
      member={member}
      roles={roles}
      canManage={hasPermission(session, "staff.edit")}
      isSelf={session.staffId === member.id}
    />
  );
}
