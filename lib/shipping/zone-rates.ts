/**
 * Weight-based shipping rate per zone (AD-254). Replaces
 * ShippingMethod.baseRateAmount as the price source for non-pickup
 * methods — see lib/cart/shipping.ts's calculateZoneShippingAmount.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type AdminZoneRate = {
  id: string;
  code: string;
  name: string;
  baseWeightGrams: number;
  baseRateAmount: number;
  extraRatePerKgAmount: number;
};

export type ZoneRateActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type ZoneRateMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export async function listAdminZoneRates(): Promise<AdminZoneRate[]> {
  const rows = await getPrisma().shippingZone.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      baseWeightGrams: true,
      baseRateAmount: true,
      extraRatePerKgAmount: true,
    },
  });
  return rows;
}

export async function saveZoneRate(input: {
  id: string;
  baseWeightGrams: string;
  baseRateAmount: string;
  extraRatePerKgAmount: string;
  actor: ZoneRateActor;
}): Promise<ZoneRateMutationResult> {
  const baseWeightGrams = Number.parseInt(input.baseWeightGrams, 10);
  const baseRateAmount = Number.parseInt(input.baseRateAmount, 10);
  const extraRatePerKgAmount = Number.parseInt(input.extraRatePerKgAmount, 10);
  if (!Number.isInteger(baseWeightGrams) || baseWeightGrams <= 0) {
    return { ok: false, formError: "Base weight must be a positive number of grams." };
  }
  if (!Number.isInteger(baseRateAmount) || baseRateAmount < 0) {
    return { ok: false, formError: "Base rate must be 0 or more." };
  }
  if (!Number.isInteger(extraRatePerKgAmount) || extraRatePerKgAmount < 0) {
    return { ok: false, formError: "Extra rate per kg must be 0 or more." };
  }

  const existing = await getPrisma().shippingZone.findUnique({
    where: { id: input.id },
    select: { id: true, code: true },
  });
  if (!existing) {
    return { ok: false, formError: "That zone no longer exists." };
  }

  await getPrisma().shippingZone.update({
    where: { id: existing.id },
    data: { baseWeightGrams, baseRateAmount, extraRatePerKgAmount },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.SHIPPING_ZONE_UPDATE,
    entityType: "ShippingZone",
    entityId: existing.id,
    metadata: {
      code: existing.code,
      baseWeightGrams,
      baseRateAmount,
      extraRatePerKgAmount,
    },
    ip: input.actor.ip,
  });
  return { ok: true };
}
