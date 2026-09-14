import {
  DEFAULT_BUSINESS_SETTINGS,
  MOCK_SOCIAL_INTEGRATIONS,
  type BusinessSettings,
  type SocialIntegration,
} from "@/lib/admin/settings-mock";
import { MOCK_ADMIN_STAFF } from "@/lib/admin/staff-admin-mock";
import type { AdminStaffMember } from "@/lib/admin/staff-types";
import { ADMIN_SUPPORT_PAGE_SIZE } from "@/lib/admin/support-list-params";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";
import type { StaffStatus as DbStaffStatus } from "@/lib/generated/prisma/enums";
import {
  parseStaffListParams,
  staffHref,
  type StaffListParams,
  type StaffListResult,
} from "@/lib/admin/staff-list-shared";

export {
  parseStaffListParams,
  staffHref,
  type StaffListParams,
  type StaffListResult,
};

export function loadBusinessSettings(): BusinessSettings {
  return { ...DEFAULT_BUSINESS_SETTINGS };
}

export function loadSocialIntegrations(): SocialIntegration[] {
  return [...MOCK_SOCIAL_INTEGRATIONS];
}

function toStaffStatus(status: DbStaffStatus): AdminStaffMember["status"] {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "DISABLED":
      return "disabled";
    default:
      return "invited";
  }
}

function toAdminStaff(row: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  status: DbStaffStatus;
  updatedAt: Date;
  role: { id: string; key: string; name: string } | null;
}): AdminStaffMember {
  const sort = row.updatedAt.toISOString();
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone ?? "—",
    role: row.role,
    status: toStaffStatus(row.status),
    lastActiveAt: row.updatedAt.toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    lastActiveSort: sort,
    department: row.department?.trim() || "—",
  };
}

function mockStaffList(params: StaffListParams): StaffListResult {
  let items = [...MOCK_ADMIN_STAFF];
  if (params.role !== "all") {
    items = items.filter((member) => member.role?.key === params.role);
  }
  if (params.status !== "all") {
    items = items.filter((member) => member.status === params.status);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (member) =>
        member.fullName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        member.department.toLowerCase().includes(q),
    );
  }
  items.sort((a, b) => b.lastActiveSort.localeCompare(a.lastActiveSort));

  const pageSize = ADMIN_SUPPORT_PAGE_SIZE;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function loadAdminStaffList(
  params: StaffListParams,
): Promise<StaffListResult> {
  if (!usesDatabase()) {
    return mockStaffList(params);
  }

  const where: {
    status?: DbStaffStatus;
    role?: { key: string };
    OR?: {
      fullName?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      phone?: { contains: string; mode: "insensitive" };
      department?: { contains: string; mode: "insensitive" };
    }[];
  } = {};

  if (params.status === "active") {
    where.status = "ACTIVE";
  } else if (params.status === "invited") {
    where.status = "INVITED";
  } else if (params.status === "disabled") {
    where.status = "DISABLED";
  }

  if (params.role !== "all") {
    where.role = { key: params.role };
  }

  if (params.q) {
    where.OR = [
      { fullName: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { phone: { contains: params.q, mode: "insensitive" } },
      { department: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const prisma = getPrisma();
  const pageSize = ADMIN_SUPPORT_PAGE_SIZE;
  const total = await prisma.staff.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.staff.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      department: true,
      status: true,
      updatedAt: true,
      role: { select: { id: true, key: true, name: true } },
    },
  });

  return {
    items: rows.map(toAdminStaff),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function getAdminStaffById(
  id: string,
): Promise<AdminStaffMember | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  if (!usesDatabase()) {
    return MOCK_ADMIN_STAFF.find((member) => member.id === trimmed) ?? null;
  }
  const row = await getPrisma().staff.findUnique({
    where: { id: trimmed },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      department: true,
      status: true,
      updatedAt: true,
      role: { select: { id: true, key: true, name: true } },
    },
  });
  return row ? toAdminStaff(row) : null;
}
