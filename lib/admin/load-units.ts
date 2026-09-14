import { listAdminUnits } from "@/lib/catalog/admin-presets";
import type { AdminUnit } from "@/lib/admin/units-mock";
import type { AdminUnitListParams } from "@/lib/admin/unit-list-params";

export type AdminUnitListResult = {
  items: AdminUnit[];
  total: number;
  params: AdminUnitListParams;
};

/** Real `ProductUnit` rows (Phase 3) — was a hardcoded mock array. */
export async function loadAdminUnitList(
  params: AdminUnitListParams,
): Promise<AdminUnitListResult> {
  let items = await listAdminUnits();

  if (params.q) {
    const needle = params.q.toLowerCase();
    items = items.filter((unit) => unit.name.toLowerCase().includes(needle));
  }

  return { items, total: items.length, params };
}
