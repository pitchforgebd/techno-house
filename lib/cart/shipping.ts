/** Display-only mock shipping. Not authoritative for charges. */

export type ShippingMethodId =
  "dhaka_home" | "nationwide_courier" | "store_pickup";

export type ShippingZoneId = "dhaka_metro" | "outside_dhaka";

export type ShippingArea = {
  id: string;
  zoneId: ShippingZoneId;
  name: string;
};

export type ShippingMethod = {
  id: ShippingMethodId;
  name: string;
  description: string;
  /** null = free / pickup */
  baseRate: number | null;
  /** Zones this method applies to; empty = all zones. */
  zoneIds: ShippingZoneId[];
};

export const MOCK_SHIPPING_ZONES: { id: ShippingZoneId; name: string }[] = [
  { id: "dhaka_metro", name: "Dhaka metro" },
  { id: "outside_dhaka", name: "Outside Dhaka" },
];

export const MOCK_SHIPPING_AREAS: ShippingArea[] = [
  { id: "dhaka-mirpur", zoneId: "dhaka_metro", name: "Mirpur" },
  { id: "dhaka-gulshan", zoneId: "dhaka_metro", name: "Gulshan" },
  { id: "dhaka-uttara", zoneId: "dhaka_metro", name: "Uttara" },
  { id: "ctg-agrabad", zoneId: "outside_dhaka", name: "Chattogram — Agrabad" },
  {
    id: "sylhet-zindabazar",
    zoneId: "outside_dhaka",
    name: "Sylhet — Zindabazar",
  },
  {
    id: "khulna-sonadanga",
    zoneId: "outside_dhaka",
    name: "Khulna — Sonadanga",
  },
];

export const MOCK_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "dhaka_home",
    name: "Dhaka home delivery",
    description: "Same-city delivery within Dhaka metro areas.",
    baseRate: 80,
    zoneIds: ["dhaka_metro"],
  },
  {
    id: "nationwide_courier",
    name: "Nationwide courier",
    description: "Courier delivery outside Dhaka metro.",
    baseRate: 150,
    zoneIds: ["outside_dhaka"],
  },
  {
    id: "store_pickup",
    name: "Store pickup",
    description: "Collect from the Techno House counter — no shipping fee.",
    baseRate: 0,
    zoneIds: [],
  },
];

export function findShippingArea(areaId: string | null): ShippingArea | null {
  if (!areaId) {
    return null;
  }
  return MOCK_SHIPPING_AREAS.find((area) => area.id === areaId) ?? null;
}

export function findShippingMethod(
  methodId: string | null,
): ShippingMethod | null {
  if (!methodId) {
    return null;
  }
  return MOCK_SHIPPING_METHODS.find((method) => method.id === methodId) ?? null;
}

export function areasForZone(zoneId: ShippingZoneId): ShippingArea[] {
  return MOCK_SHIPPING_AREAS.filter((area) => area.zoneId === zoneId);
}

export function methodsForZone(
  zoneId: ShippingZoneId | null,
): ShippingMethod[] {
  if (!zoneId) {
    return MOCK_SHIPPING_METHODS.filter(
      (method) => method.id === "store_pickup",
    );
  }
  return MOCK_SHIPPING_METHODS.filter(
    (method) => method.zoneIds.length === 0 || method.zoneIds.includes(zoneId),
  );
}

export function resolveShippingRate(
  methodId: string | null,
  areaId: string | null,
):
  | {
      ok: true;
      amount: number;
      method: ShippingMethod;
      area: ShippingArea | null;
    }
  | { ok: false } {
  const method = findShippingMethod(methodId);
  if (!method) {
    return { ok: false };
  }

  if (method.id === "store_pickup") {
    return { ok: true, amount: 0, method, area: findShippingArea(areaId) };
  }

  const area = findShippingArea(areaId);
  if (!area) {
    return { ok: false };
  }

  if (method.zoneIds.length > 0 && !method.zoneIds.includes(area.zoneId)) {
    return { ok: false };
  }

  return {
    ok: true,
    amount: method.baseRate ?? 0,
    method,
    area,
  };
}
