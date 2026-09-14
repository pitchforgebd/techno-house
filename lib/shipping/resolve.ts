/**
 * Server-side shipping rate (P16-T01 / P16-T02).
 *
 * Uses persisted methods, zones, and areas when the database is on.
 * Inactive rows cannot be charged.
 */
import {
  resolveShippingRate,
  type ShippingArea,
  type ShippingMethod,
} from "@/lib/cart/shipping";
import { listPublicShippingAreas } from "@/lib/shipping/locations";
import { listPublicShippingMethods } from "@/lib/shipping/methods";

export async function resolvePersistedShippingRate(
  methodId: string | null,
  areaId: string | null,
  totalWeightGrams = 0,
): Promise<
  | {
      ok: true;
      amount: number;
      method: ShippingMethod;
      area: ShippingArea | null;
    }
  | { ok: false }
> {
  const [methods, areas] = await Promise.all([
    listPublicShippingMethods(),
    listPublicShippingAreas(),
  ]);
  return resolveShippingRate(methodId, areaId, methods, areas, totalWeightGrams);
}
