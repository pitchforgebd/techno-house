import type { Metadata } from "next";
import { AdminCustomerList } from "@/features/admin/customers/admin-customer-list";
import {
  loadAdminCustomerList,
  parseAdminCustomerListParams,
  type AdminCustomerSearchParams,
} from "@/lib/admin/load-customers";

export const metadata: Metadata = {
  title: "Customers",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<AdminCustomerSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminCustomerListParams(raw);
  const data = await loadAdminCustomerList(params);
  return <AdminCustomerList data={data} />;
}
