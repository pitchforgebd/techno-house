/**
 * Shipping zones and areas (P16-T02).
 *
 * Rows live on `ShippingZone` / `ShippingArea`. Countries, states,
 * cities, and carriers stay mock. Public area ids are
 * `${zoneCode}::${name}` so cart state stays stable across re-seeds.
 * `DATA_SOURCE=mock` keeps `MOCK_SHIPPING_*`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  MOCK_SHIPPING_AREAS,
  MOCK_SHIPPING_ZONES,
  type ShippingArea,
  type ShippingZone,
} from "@/lib/cart/shipping";
import { getPrisma } from "@/lib/db/prisma";
import type {
  ShippingActor,
  ShippingMutationResult,
} from "@/lib/shipping/methods";

export type AdminShippingZone = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  areaCount: number;
};

export type AdminShippingArea = {
  id: string;
  name: string;
  isActive: boolean;
  zoneId: string;
  zoneCode: string;
  zoneName: string;
};

const NAME_MAX = 80;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): ShippingMutationResult {
  return { ok: false, formError };
}

export function publicAreaId(zoneCode: string, name: string): string {
  return `${zoneCode}::${name}`;
}

export function parsePublicAreaId(
  areaId: string | null,
): { zoneCode: string; name: string } | null {
  if (!areaId) {
    return null;
  }
  const sep = areaId.indexOf("::");
  if (sep <= 0) {
    return null;
  }
  const zoneCode = areaId.slice(0, sep);
  const name = areaId.slice(sep + 2);
  if (!zoneCode || !name) {
    return null;
  }
  return { zoneCode, name };
}

export async function listPublicShippingZones(): Promise<ShippingZone[]> {
  if (!usesDatabase()) {
    return MOCK_SHIPPING_ZONES;
  }
  const rows = await getPrisma().shippingZone.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { code: true, name: true },
  });
  return rows.map((row) => ({ id: row.code, name: row.name }));
}

export async function listPublicShippingAreas(): Promise<ShippingArea[]> {
  if (!usesDatabase()) {
    return MOCK_SHIPPING_AREAS;
  }
  const rows = await getPrisma().shippingArea.findMany({
    where: { isActive: true, zone: { isActive: true } },
    orderBy: [{ name: "asc" }],
    select: {
      name: true,
      zone: {
        select: {
          code: true,
          baseWeightGrams: true,
          baseRateAmount: true,
          extraRatePerKgAmount: true,
        },
      },
    },
  });
  return rows.map((row) => ({
    id: publicAreaId(row.zone.code, row.name),
    zoneId: row.zone.code,
    name: row.name,
    zoneBaseWeightGrams: row.zone.baseWeightGrams,
    zoneBaseRateAmount: row.zone.baseRateAmount,
    zoneExtraRatePerKgAmount: row.zone.extraRatePerKgAmount,
  }));
}

export async function listAdminShippingZones(): Promise<AdminShippingZone[]> {
  if (!usesDatabase()) {
    return MOCK_SHIPPING_ZONES.map((zone) => ({
      id: zone.id,
      code: zone.id,
      name: zone.name,
      isActive: true,
      areaCount: MOCK_SHIPPING_AREAS.filter((area) => area.zoneId === zone.id)
        .length,
    }));
  }
  const rows = await getPrisma().shippingZone.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      _count: { select: { areas: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    areaCount: row._count.areas,
  }));
}

export async function listAdminShippingAreas(): Promise<AdminShippingArea[]> {
  if (!usesDatabase()) {
    return MOCK_SHIPPING_AREAS.map((area) => {
      const zone = MOCK_SHIPPING_ZONES.find((item) => item.id === area.zoneId);
      return {
        id: area.id,
        name: area.name,
        isActive: true,
        zoneId: area.zoneId,
        zoneCode: area.zoneId,
        zoneName: zone?.name ?? area.zoneId,
      };
    });
  }
  const rows = await getPrisma().shippingArea.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      isActive: true,
      zoneId: true,
      zone: { select: { code: true, name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    zoneId: row.zoneId,
    zoneCode: row.zone.code,
    zoneName: row.zone.name,
  }));
}

export async function saveShippingZone(input: {
  id: string;
  name: string;
  isActive: boolean;
  actor?: ShippingActor;
}): Promise<ShippingMutationResult> {
  if (!usesDatabase()) {
    return fail(
      "Shipping changes need the database. Turn off DATA_SOURCE=mock to save.",
    );
  }
  const id = input.id.trim();
  if (!id) {
    return fail("That zone no longer exists.");
  }
  const name = input.name.replace(/[<>]/g, "").trim().slice(0, NAME_MAX);
  if (!name) {
    return fail("Enter a zone name.");
  }

  const existing = await getPrisma().shippingZone.findUnique({
    where: { id },
    select: { id: true, code: true },
  });
  if (!existing) {
    return fail("That zone no longer exists.");
  }

  const row = await getPrisma().shippingZone.update({
    where: { id: existing.id },
    data: { name, isActive: input.isActive },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.SHIPPING_ZONE_UPDATE,
      entityType: "ShippingZone",
      entityId: row.id,
      metadata: { code: existing.code, isActive: input.isActive },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}

export async function saveShippingArea(input: {
  id: string;
  name: string;
  isActive: boolean;
  actor?: ShippingActor;
}): Promise<ShippingMutationResult> {
  if (!usesDatabase()) {
    return fail(
      "Shipping changes need the database. Turn off DATA_SOURCE=mock to save.",
    );
  }
  const id = input.id.trim();
  if (!id) {
    return fail("That area no longer exists.");
  }
  const name = input.name.replace(/[<>]/g, "").trim().slice(0, NAME_MAX);
  if (!name) {
    return fail("Enter an area name.");
  }

  const existing = await getPrisma().shippingArea.findUnique({
    where: { id },
    select: { id: true, zoneId: true, name: true },
  });
  if (!existing) {
    return fail("That area no longer exists.");
  }

  if (name !== existing.name) {
    const clash = await getPrisma().shippingArea.findFirst({
      where: {
        zoneId: existing.zoneId,
        name,
        NOT: { id: existing.id },
      },
      select: { id: true },
    });
    if (clash) {
      return fail("That area name is already used in this zone.");
    }
  }

  const row = await getPrisma().shippingArea.update({
    where: { id: existing.id },
    data: { name, isActive: input.isActive },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.SHIPPING_AREA_UPDATE,
      entityType: "ShippingArea",
      entityId: row.id,
      metadata: { isActive: input.isActive },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}
