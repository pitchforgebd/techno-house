/**
 * Bangladesh districts/upazilas — public checkout read (AD-254).
 * Each upazila resolves to a real ShippingArea (seeded by
 * scripts/shipping/seed-districts.ts), so selecting one just feeds the
 * existing Cart/Order shippingAreaId mechanism — no new persisted state.
 */
import { getPrisma } from "@/lib/db/prisma";
import { publicAreaId } from "@/lib/shipping/locations";
import { usesDatabase } from "@/lib/runtime/data-source";

export type PublicDistrict = { id: string; name: string };
export type PublicUpazila = {
  id: string;
  name: string;
  districtId: string;
  shippingAreaId: string | null;
};

export async function listPublicDistricts(): Promise<PublicDistrict[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().district.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return rows;
}

export async function listPublicUpazilas(): Promise<PublicUpazila[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().upazila.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      districtId: true,
      shippingArea: { select: { name: true, zone: { select: { code: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    districtId: row.districtId,
    shippingAreaId: row.shippingArea
      ? publicAreaId(row.shippingArea.zone.code, row.shippingArea.name)
      : null,
  }));
}
