import { getAdminLabelById, listAdminLabels } from "@/lib/catalog/admin-presets";
import type { AdminCustomLabel } from "@/lib/admin/labels-mock";
import { type AdminLabelListParams } from "@/lib/admin/label-list-params";

export type AdminLabelListResult = {
  items: AdminCustomLabel[];
  total: number;
  params: AdminLabelListParams;
  storefrontEnabled: boolean;
};

/** Real `ProductLabelPreset` rows (Phase 3) — was a hardcoded mock array. */
export async function loadAdminLabelList(
  params: AdminLabelListParams,
): Promise<AdminLabelListResult> {
  const rows = await listAdminLabels();
  let items: AdminCustomLabel[] = rows.map((row) => ({
    id: row.id,
    text: row.text,
    backgroundColor: row.backgroundColor,
    textTone: row.textTone,
    isSystem: row.isSystem,
    // The old mock split labels into "system" vs "inhouse"; that is now simply
    // whether the row is a protected system label.
    source: row.isSystem ? "system" : "inhouse",
    status: row.isActive,
    productIds: row.productIds,
  }));

  if (params.tab === "inhouse") {
    items = items.filter((item) => item.source === "inhouse");
  }

  if (params.q) {
    const needle = params.q.toLowerCase();
    items = items.filter((item) => item.text.toLowerCase().includes(needle));
  }

  return {
    items,
    total: items.length,
    params,
    storefrontEnabled: true,
  };
}

/** Real `ProductLabelPreset` row by id — backs the edit page (was `getMockLabelById`). */
export async function loadAdminLabelById(
  id: string,
): Promise<AdminCustomLabel | null> {
  const row = await getAdminLabelById(id);
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    text: row.text,
    backgroundColor: row.backgroundColor,
    textTone: row.textTone,
    isSystem: row.isSystem,
    source: row.isSystem ? "system" : "inhouse",
    status: row.isActive,
    productIds: row.productIds,
  };
}
