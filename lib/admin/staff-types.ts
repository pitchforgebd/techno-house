/**
 * Real admin staff types (AD-255). Staff carry an actual `Role` (arbitrary,
 * admin-defined via /admin/staff/roles) — not the old fixed
 * admin/manager/support buckets from lib/admin/mock-staff.ts.
 */

export type StaffMemberStatus = "active" | "invited" | "disabled";

export type AdminStaffRoleRef = { id: string; key: string; name: string };

export type AdminStaffMember = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminStaffRoleRef | null;
  status: StaffMemberStatus;
  lastActiveAt: string;
  lastActiveSort: string;
  department: string;
};

export function staffStatusLabel(status: StaffMemberStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "invited":
      return "Invited";
    case "disabled":
      return "Disabled";
  }
}

export function staffStatusTone(
  status: StaffMemberStatus,
): "stock" | "sale" | "warranty" | "neutral" {
  if (status === "active") {
    return "stock";
  }
  if (status === "invited") {
    return "warranty";
  }
  return "neutral";
}
