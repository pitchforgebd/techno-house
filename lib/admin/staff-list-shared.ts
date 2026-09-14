/**
 * Client-safe admin staff list helpers (no Prisma / Node imports).
 */
import type { AdminStaffMember, StaffMemberStatus } from "@/lib/admin/staff-types";
import type { AdminListSearchParams } from "@/lib/admin/support-list-params";

export type StaffListParams = {
  q: string;
  /** A real Role.key, or "all". Not validated against a fixed set here. */
  role: "all" | string;
  status: "all" | AdminStaffMember["status"];
  page: number;
};

export type StaffListResult = {
  items: AdminStaffMember[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: StaffListParams;
};

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(n, 500);
}

const STATUSES: Set<"all" | StaffMemberStatus> = new Set([
  "all",
  "active",
  "invited",
  "disabled",
]);

export function parseStaffListParams(
  searchParams: AdminListSearchParams,
): StaffListParams {
  const roleRaw = first(searchParams.role).trim().slice(0, 60);
  const statusRaw = first(searchParams.status).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    role: roleRaw || "all",
    status: (STATUSES.has(statusRaw as StaffMemberStatus)
      ? statusRaw
      : "all") as StaffListParams["status"],
    page: parsePage(first(searchParams.page)),
  };
}

export function staffHref(
  params: Partial<StaffListParams> & { base?: StaffListParams },
): string {
  const base = params.base ?? {
    q: "",
    role: "all" as const,
    status: "all" as const,
    page: 1,
  };
  const next = {
    q: params.q ?? base.q,
    role: params.role ?? base.role,
    status: params.status ?? base.status,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.role !== "all") {
    query.set("role", next.role);
  }
  if (next.status !== "all") {
    query.set("status", next.status);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/staff?${qs}` : "/admin/staff";
}
