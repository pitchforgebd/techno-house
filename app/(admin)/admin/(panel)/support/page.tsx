import type { Metadata } from "next";
import { AdminTicketList } from "@/features/admin/support/admin-ticket-list";
import { loadAdminTicketList } from "@/lib/admin/load-support";
import {
  parseTicketListParams,
  type AdminListSearchParams,
} from "@/lib/admin/support-list-params";

export const metadata: Metadata = {
  title: "Support Desk",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<AdminListSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseTicketListParams(raw);
  const data = await loadAdminTicketList(params);
  return <AdminTicketList data={data} />;
}
