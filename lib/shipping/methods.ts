/**
 * Shipping methods (P16-T01).
 *
 * Rows live on `ShippingMethod`. Zones and areas are P16-T02.
 * Pathao / Steadfast credentials are not stored.
 * `DATA_SOURCE=mock` keeps `MOCK_SHIPPING_METHODS`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  MOCK_SHIPPING_METHODS,
  type ShippingMethod,
  type ShippingZoneId,
} from "@/lib/cart/shipping";
import { getPrisma } from "@/lib/db/prisma";
import type { AdminShippingMethod } from "@/lib/shipping/types";

export type { AdminShippingMethod } from "@/lib/shipping/types";

export const SHIPPING_DB_REQUIRED =
  "Shipping changes need the database. Turn off DATA_SOURCE=mock to save.";

export type ShippingMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type ShippingActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const NAME_MAX = 80;
const DESCRIPTION_MAX = 240;
const RATE_MAX = 100_000;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): ShippingMutationResult {
  return { ok: false, formError };
}

function toPublicMethod(row: {
  code: string;
  name: string;
  description: string | null;
  baseRateAmount: number | null;
  isPickup: boolean;
  zones: { zone: { code: string } }[];
}): ShippingMethod {
  const zoneIds = row.zones
    .map((link) => link.zone.code.trim())
    .filter((code): code is ShippingZoneId => Boolean(code));
  return {
    id: row.code,
    name: row.name,
    description: row.description ?? "",
    baseRate: row.baseRateAmount,
    zoneIds,
    isPickup: row.isPickup,
  };
}

export async function listPublicShippingMethods(): Promise<ShippingMethod[]> {
  if (!usesDatabase()) {
    return MOCK_SHIPPING_METHODS;
  }
  const rows = await getPrisma().shippingMethod.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      code: true,
      name: true,
      description: true,
      baseRateAmount: true,
      isPickup: true,
      zones: { select: { zone: { select: { code: true } } } },
    },
  });
  return rows.map(toPublicMethod);
}

export async function listAdminShippingMethods(): Promise<
  AdminShippingMethod[]
> {
  if (!usesDatabase()) {
    return MOCK_SHIPPING_METHODS.map((method, index) => ({
      id: method.id,
      code: method.id,
      name: method.name,
      description: method.description,
      baseRate: method.baseRate ?? 0,
      isPickup: method.isPickup,
      isActive: true,
      position: index,
      zoneCodes: [...method.zoneIds],
    }));
  }
  const rows = await getPrisma().shippingMethod.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      baseRateAmount: true,
      isPickup: true,
      isActive: true,
      position: true,
      zones: { select: { zone: { select: { code: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    baseRate: row.baseRateAmount ?? 0,
    isPickup: row.isPickup,
    isActive: row.isActive,
    position: row.position,
    zoneCodes: row.zones.map((link) => link.zone.code),
  }));
}

export async function saveShippingMethod(input: {
  id: string;
  name: string;
  description: string;
  baseRate: string;
  isPickup: boolean;
  isActive: boolean;
  actor?: ShippingActor;
}): Promise<ShippingMutationResult> {
  if (!usesDatabase()) {
    return fail(SHIPPING_DB_REQUIRED);
  }
  const id = input.id.trim();
  if (!id) {
    return fail("That shipping method no longer exists.");
  }
  const name = input.name.replace(/[<>]/g, "").trim().slice(0, NAME_MAX);
  if (!name) {
    return fail("Enter a method name.");
  }
  const description = input.description
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, DESCRIPTION_MAX);
  const parsed = Number.parseInt(input.baseRate.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > RATE_MAX) {
    return fail("Enter a shipping rate of 0 or more.");
  }

  const existing = await getPrisma().shippingMethod.findUnique({
    where: { id },
    select: { id: true, code: true },
  });
  if (!existing) {
    return fail("That shipping method no longer exists.");
  }

  const row = await getPrisma().shippingMethod.update({
    where: { id: existing.id },
    data: {
      name,
      description: description || null,
      baseRateAmount: parsed,
      isPickup: input.isPickup,
      isActive: input.isActive,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.SHIPPING_METHOD_UPDATE,
      entityType: "ShippingMethod",
      entityId: row.id,
      metadata: { code: existing.code, isActive: input.isActive },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}
