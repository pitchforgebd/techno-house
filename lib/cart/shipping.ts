/**
 * Shipping method / zone / area shapes (P16-T01 / P16-T02).
 *
 * Methods, zones, and areas come from the database when it is on.
 * Countries / states / cities stay mock. Client previews are not
 * authoritative — order place resolves the rate on the server.
 */

export type ShippingMethodId = string;

export type ShippingZoneId = string;

export type ShippingZone = {
  id: ShippingZoneId;
  name: string;
};

export type ShippingArea = {
  id: string;
  zoneId: ShippingZoneId;
  name: string;
  /** Denormalised from the area's zone so pricing needs no extra lookup. */
  zoneBaseWeightGrams: number;
  zoneBaseRateAmount: number;
  zoneExtraRatePerKgAmount: number;
};

export type ShippingMethod = {
  id: ShippingMethodId;
  name: string;
  description: string;
  /** null = free / pickup */
  baseRate: number | null;
  /** Zones this method applies to; empty = all zones. */
  zoneIds: ShippingZoneId[];
  isPickup: boolean;
};

export const MOCK_SHIPPING_ZONES: ShippingZone[] = [
  { id: "dhaka_metro", name: "Dhaka metro" },
  { id: "outside_dhaka", name: "Outside Dhaka" },
];

const MOCK_INSIDE_DHAKA_RATE = {
  zoneBaseWeightGrams: 1000,
  zoneBaseRateAmount: 60,
  zoneExtraRatePerKgAmount: 20,
};
const MOCK_OUTSIDE_DHAKA_RATE = {
  zoneBaseWeightGrams: 1000,
  zoneBaseRateAmount: 120,
  zoneExtraRatePerKgAmount: 30,
};

export const MOCK_SHIPPING_AREAS: ShippingArea[] = [
  { id: "dhaka-mirpur", zoneId: "dhaka_metro", name: "Mirpur", ...MOCK_INSIDE_DHAKA_RATE },
  { id: "dhaka-gulshan", zoneId: "dhaka_metro", name: "Gulshan", ...MOCK_INSIDE_DHAKA_RATE },
  { id: "dhaka-uttara", zoneId: "dhaka_metro", name: "Uttara", ...MOCK_INSIDE_DHAKA_RATE },
  {
    id: "ctg-agrabad",
    zoneId: "outside_dhaka",
    name: "Chattogram — Agrabad",
    ...MOCK_OUTSIDE_DHAKA_RATE,
  },
  {
    id: "sylhet-zindabazar",
    zoneId: "outside_dhaka",
    name: "Sylhet — Zindabazar",
    ...MOCK_OUTSIDE_DHAKA_RATE,
  },
  {
    id: "khulna-sonadanga",
    zoneId: "outside_dhaka",
    name: "Khulna — Sonadanga",
    ...MOCK_OUTSIDE_DHAKA_RATE,
  },
];

export const MOCK_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "dhaka_home",
    name: "Dhaka home delivery",
    description: "Same-city delivery within Dhaka metro areas.",
    baseRate: 80,
    zoneIds: ["dhaka_metro"],
    isPickup: false,
  },
  {
    id: "nationwide_courier",
    name: "Nationwide courier",
    description: "Courier delivery outside Dhaka metro.",
    baseRate: 150,
    zoneIds: ["outside_dhaka"],
    isPickup: false,
  },
  {
    id: "store_pickup",
    name: "Store pickup",
    description: "Collect from the Techno House counter — no shipping fee.",
    baseRate: 0,
    zoneIds: [],
    isPickup: true,
  },
];

export function findShippingArea(
  areaId: string | null,
  areas: ShippingArea[] = MOCK_SHIPPING_AREAS,
): ShippingArea | null {
  if (!areaId) {
    return null;
  }
  return areas.find((area) => area.id === areaId) ?? null;
}

export function findShippingMethod(
  methodId: string | null,
  methods: ShippingMethod[] = MOCK_SHIPPING_METHODS,
): ShippingMethod | null {
  if (!methodId) {
    return null;
  }
  return methods.find((method) => method.id === methodId) ?? null;
}

export function areasForZone(
  zoneId: ShippingZoneId,
  areas: ShippingArea[] = MOCK_SHIPPING_AREAS,
): ShippingArea[] {
  return areas.filter((area) => area.zoneId === zoneId);
}

export function methodsForZone(
  zoneId: ShippingZoneId | null,
  methods: ShippingMethod[] = MOCK_SHIPPING_METHODS,
): ShippingMethod[] {
  if (!zoneId) {
    return methods.filter((method) => method.isPickup);
  }
  return methods.filter(
    (method) =>
      method.isPickup ||
      method.zoneIds.length === 0 ||
      method.zoneIds.includes(zoneId),
  );
}

/**
 * Weight-based zone rate (AD-254): baseRateAmount covers the first
 * baseWeightGrams; extraRatePerKgAmount applies per additional kg (rounded
 * up) beyond that.
 */
export function calculateZoneShippingAmount(
  zone: {
    zoneBaseWeightGrams: number;
    zoneBaseRateAmount: number;
    zoneExtraRatePerKgAmount: number;
  },
  totalWeightGrams: number,
): number {
  const extraGrams = Math.max(0, totalWeightGrams - zone.zoneBaseWeightGrams);
  const extraKg = Math.ceil(extraGrams / 1000);
  return zone.zoneBaseRateAmount + extraKg * zone.zoneExtraRatePerKgAmount;
}

export function resolveShippingRate(
  methodId: string | null,
  areaId: string | null,
  methods: ShippingMethod[] = MOCK_SHIPPING_METHODS,
  areas: ShippingArea[] = MOCK_SHIPPING_AREAS,
  totalWeightGrams = 0,
):
  | {
      ok: true;
      amount: number;
      method: ShippingMethod;
      area: ShippingArea | null;
    }
  | { ok: false } {
  const method = findShippingMethod(methodId, methods);
  if (!method) {
    return { ok: false };
  }

  if (method.isPickup) {
    return {
      ok: true,
      amount: 0,
      method,
      area: findShippingArea(areaId, areas),
    };
  }

  const area = findShippingArea(areaId, areas);
  if (!area) {
    return { ok: false };
  }

  if (method.zoneIds.length > 0 && !method.zoneIds.includes(area.zoneId)) {
    return { ok: false };
  }

  return {
    ok: true,
    amount: calculateZoneShippingAmount(area, totalWeightGrams),
    method,
    area,
  };
}
