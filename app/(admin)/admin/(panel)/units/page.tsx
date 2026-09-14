import type { Metadata } from "next";
import { AdminUnitList } from "@/features/admin/units/admin-unit-list";
import { loadAdminUnitList } from "@/lib/admin/load-units";
import {
  parseAdminUnitListParams,
  type AdminUnitSearchParams,
} from "@/lib/admin/unit-list-params";

export const metadata: Metadata = {
  title: "Units",
};

export default async function AdminUnitsPage({
  searchParams,
}: {
  searchParams: Promise<AdminUnitSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminUnitListParams(raw);
  const data = await loadAdminUnitList(params);
  return (
    <AdminUnitList
      items={data.items}
      total={data.total}
      params={data.params}
    />
  );
}
