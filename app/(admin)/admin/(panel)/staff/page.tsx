import type { Metadata } from "next";
import { AdminStaffList } from "@/features/admin/staff/admin-staff-list";
import {
  loadAdminStaffList,
  parseStaffListParams,
} from "@/lib/admin/load-settings";
import type { AdminListSearchParams } from "@/lib/admin/support-list-params";

export const metadata: Metadata = {
  title: "All staffs",
};

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<AdminListSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseStaffListParams(raw);
  const data = await loadAdminStaffList(params);
  return <AdminStaffList data={data} />;
}
