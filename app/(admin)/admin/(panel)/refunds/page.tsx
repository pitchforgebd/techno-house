import type { Metadata } from "next";
import { AdminRefundList } from "@/features/admin/refunds/admin-refund-list";
import { staffWithPermission } from "@/lib/auth/permissions";
import { loadAdminRefundList } from "@/lib/admin/load-refunds";
import {
  parseAdminRefundListParams,
  type AdminRefundSearchParams,
} from "@/lib/admin/refund-list-params";

export const metadata: Metadata = {
  title: "Refunds",
};

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<AdminRefundSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminRefundListParams(raw);
  const data = await loadAdminRefundList(params);
  const allowed = await staffWithPermission("refunds.process");
  return <AdminRefundList data={data} mode="refunds" canProcess={allowed.ok} />;
}
