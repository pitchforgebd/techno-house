/**
 * Promotional Products channel (`/admin/promotions/products`) — Phase 2.
 *
 * Assignment previously came from a hardcoded `MOCK_PROMOTIONAL_PRODUCT_IDS`
 * array and every mutation was a toast. It is now `Product.isPromotional`,
 * mirroring how Today's Deal uses `Product.isSale` (`lib/marketing/deals.ts`).
 *
 * Merchandising only: like Today's Deal, this flag does not change pricing —
 * checkout still recalculates from the product's own price.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export const PROMOTIONAL_DB_REQUIRED =
  "Promotional product changes need the database. Turn off DATA_SOURCE=mock to save.";

export type PromotionalMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type PromotionalActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

/** Same cap as Today's Deal, so one request cannot flip the whole catalogue. */
const PRODUCT_CAP = 50;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function countPromotionalProducts(): Promise<number> {
  if (!usesDatabase()) {
    return 0;
  }
  return getPrisma().product.count({ where: { isPromotional: true } });
}

export async function listPromotionalProductIds(): Promise<string[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().product.findMany({
    where: { isPromotional: true },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function setFlag(
  productIds: string[],
  on: boolean,
  actor: PromotionalActor | undefined,
): Promise<PromotionalMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: PROMOTIONAL_DB_REQUIRED };
  }

  const ids = [
    ...new Set(productIds.map((id) => id.trim()).filter(Boolean)),
  ].slice(0, PRODUCT_CAP);
  if (ids.length === 0) {
    return { ok: false, formError: "Select at least one product." };
  }

  // Reject the whole request if any id is unknown, rather than silently
  // applying a partial change and reporting success.
  const found = await getPrisma().product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    return { ok: false, formError: "One or more products no longer exist." };
  }

  await getPrisma().product.updateMany({
    where: { id: { in: ids } },
    data: { isPromotional: on },
  });

  if (actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: actor.staffId,
      actorLabel: actor.email,
      action: AUDIT_ACTIONS.PROMOTIONAL_PRODUCTS_UPDATE,
      entityType: "Product",
      entityId: ids.length === 1 ? ids[0]! : "bulk",
      ip: actor.ip,
      metadata: { count: ids.length, on },
    });
  }

  return { ok: true };
}

export async function assignPromotionalProducts(input: {
  productIds: string[];
  actor?: PromotionalActor;
}): Promise<PromotionalMutationResult> {
  return setFlag(input.productIds, true, input.actor);
}

export async function removePromotionalProduct(input: {
  productId: string;
  actor?: PromotionalActor;
}): Promise<PromotionalMutationResult> {
  return setFlag([input.productId], false, input.actor);
}

export async function removePromotionalProducts(input: {
  productIds: string[];
  actor?: PromotionalActor;
}): Promise<PromotionalMutationResult> {
  return setFlag(input.productIds, false, input.actor);
}

export async function setPromotionalProductFlag(input: {
  productId: string;
  on: boolean;
  actor?: PromotionalActor;
}): Promise<PromotionalMutationResult> {
  return setFlag([input.productId], input.on, input.actor);
}
