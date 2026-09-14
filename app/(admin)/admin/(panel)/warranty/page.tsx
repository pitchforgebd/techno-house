import type { Metadata } from "next";
import { AdminWarrantyList } from "@/features/admin/warranty/admin-warranty-list";
import { loadAdminWarrantyList } from "@/lib/admin/load-warranties";
import {
  parseAdminWarrantyListParams,
  type AdminWarrantySearchParams,
} from "@/lib/admin/warranty-list-params";

export const metadata: Metadata = {
  title: "Warranties",
};

export default async function AdminWarrantyPage({
  searchParams,
}: {
  searchParams: Promise<AdminWarrantySearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminWarrantyListParams(raw);
  const data = await loadAdminWarrantyList(params);
  return (
    <AdminWarrantyList
      items={data.items}
      total={data.total}
      params={data.params}
    />
  );
}
