import { listAdminWarranties } from "@/lib/catalog/admin-presets";
import type { AdminWarranty } from "@/lib/admin/warranties-mock";
import type { AdminWarrantyListParams } from "@/lib/admin/warranty-list-params";

export type AdminWarrantyListResult = {
  items: AdminWarranty[];
  total: number;
  params: AdminWarrantyListParams;
};

/**
 * Real `ProductWarranty` rows (Phase 3). That model was already the live
 * preset table used by `Product.warrantyId`; only this admin page was fake.
 */
export async function loadAdminWarrantyList(
  params: AdminWarrantyListParams,
): Promise<AdminWarrantyListResult> {
  let items = await listAdminWarranties();

  if (params.q) {
    const needle = params.q.toLowerCase();
    items = items.filter(
      (item) =>
        item.text.toLowerCase().includes(needle) ||
        item.badge.toLowerCase().includes(needle),
    );
  }

  return { items, total: items.length, params };
}
