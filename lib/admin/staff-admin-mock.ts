/**
 * Demo staff directory used only when DATA_SOURCE=mock. Live sessions read
 * staff and roles from PostgreSQL (see lib/admin/load-settings.ts).
 */
import type { AdminStaffMember } from "@/lib/admin/staff-types";

export const MOCK_ADMIN_STAFF: readonly AdminStaffMember[] = [
  {
    id: "staff-ayesha",
    fullName: "Ayesha Rahman",
    email: "ops@techno-house.demo",
    phone: "+880 1712-345678",
    role: { id: "role-admin", key: "role-admin", name: "Admin" },
    status: "active",
    lastActiveAt: "2026-08-31 · 16:30",
    lastActiveSort: "2026-08-31T16:30:00",
    department: "Operations",
  },
  {
    id: "staff-karim",
    fullName: "Karim Hossain",
    email: "catalog@techno-house.demo",
    phone: "+880 1812-987654",
    role: { id: "role-manager", key: "role-manager", name: "Manager" },
    status: "active",
    lastActiveAt: "2026-08-31 · 14:10",
    lastActiveSort: "2026-08-31T14:10:00",
    department: "Merchandising",
  },
  {
    id: "staff-nadia",
    fullName: "Nadia Chowdhury",
    email: "support@techno-house.demo",
    phone: "+880 1911-223344",
    role: { id: "role-support", key: "role-support", name: "Support" },
    status: "active",
    lastActiveAt: "2026-08-31 · 15:45",
    lastActiveSort: "2026-08-31T15:45:00",
    department: "Support",
  },
  {
    id: "staff-omar",
    fullName: "Omar Siddique",
    email: "finance@techno-house.demo",
    phone: "+880 1612-556677",
    role: { id: "role-manager", key: "role-manager", name: "Manager" },
    status: "invited",
    lastActiveAt: "—",
    lastActiveSort: "2026-08-20T09:00:00",
    department: "Finance",
  },
  {
    id: "staff-retired",
    fullName: "Former Staff",
    email: "old@techno-house.demo",
    phone: "+880 1512-000000",
    role: { id: "role-support", key: "role-support", name: "Support" },
    status: "disabled",
    lastActiveAt: "2026-06-01",
    lastActiveSort: "2026-06-01T00:00:00",
    department: "Support",
  },
];
