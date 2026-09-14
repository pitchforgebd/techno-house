/**
 * Today's deal assignments (P15-T02).
 *
 * The live admin list and product form both use `Product.isSale`.
 * Checkout still recalculates prices — this flag is merchandising only.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { mockProducts } from "@/lib/data/mocks/catalog";
import { getPrisma } from "@/lib/db/prisma";

export const DEALS_DB_REQUIRED =
  "Today's deal changes need the database. Turn off DATA_SOURCE=mock to save.";

export type DealMutationResult =
  { ok: true } | { ok: false; formError: string };

export type DealActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const PRODUCT_CAP = 50;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function countTodaysDealProducts(): Promise<number> {
  if (!usesDatabase()) {
    return mockProducts.filter((product) => product.isSale).length;
  }
  return getPrisma().product.count({ where: { isSale: true } });
}

export async function setTodaysDealFlag(input: {
  productIds: string[];
  on: boolean;
  actor?: DealActor;
}): Promise<DealMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: DEALS_DB_REQUIRED };
  }

  const ids = [
    ...new Set(input.productIds.map((id) => id.trim()).filter(Boolean)),
  ].slice(0, PRODUCT_CAP);
  if (ids.length === 0) {
    return { ok: false, formError: "Select at least one product." };
  }

  const found = await getPrisma().product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    return { ok: false, formError: "One or more products no longer exist." };
  }

  await getPrisma().product.updateMany({
    where: { id: { in: ids } },
    data: { isSale: input.on },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: input.on
        ? AUDIT_ACTIONS.DEAL_ASSIGN
        : AUDIT_ACTIONS.DEAL_UNASSIGN,
      entityType: "Product",
      entityId: ids[0],
      metadata: { productIds: ids, on: input.on },
      ip: input.actor.ip,
    });
  }

  return { ok: true };
}
