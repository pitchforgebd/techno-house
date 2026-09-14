import type { Metadata } from "next";
import { AdminB2bAccountsList } from "@/features/admin/customers/admin-b2b-accounts";
import { listAdminB2BAccounts, parseAdminB2BParams } from "@/lib/admin/b2b-accounts";
import type { AdminListSearchParams } from "@/lib/admin/support-list-params";

export const metadata: Metadata = {
  title: "B2B accounts",
};

export default async function AdminB2bAccountsPage({
  searchParams,
}: {
  searchParams: Promise<AdminListSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminB2BParams(raw);
  const data = await listAdminB2BAccounts(params);
  return <AdminB2bAccountsList data={data} />;
}
