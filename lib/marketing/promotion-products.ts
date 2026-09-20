/**
 * Product assignment for a single Promotion campaign (`PromotionProduct`).
 *
 * Mirrors the Today's Deal / Promotional Products channels
 * (`lib/marketing/deals.ts`, `lib/marketing/promotional-products.ts`), but
 * those are both a single global boolean flag on `Product` — one deal list,
 * one promotional list, for the whole store. A campaign banner needs its own
 * product set per promotion, so this is a join-table assignment keyed by
 * `promotionId` instead.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export const PROMOTION_PRODUCTS_DB_REQUIRED =
  "Offer product changes need the database. Turn off DATA_SOURCE=mock to save.";

export type PromotionProductMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type PromotionProductActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

/** Same cap as the other promo channels — one request can't flip the whole catalogue. */
const PRODUCT_CAP = 50;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function listPromotionProductIds(
  promotionId: string,
): Promise<string[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().promotionProduct.findMany({
    where: { promotionId },
    orderBy: { position: "asc" },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}

/** Ordered product slugs for a campaign, for the public `/offers/[slug]` grid. */
export async function listPromotionProductSlugs(
  promotionId: string,
): Promise<string[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().promotionProduct.findMany({
    where: { promotionId },
    orderBy: { position: "asc" },
    select: { product: { select: { slug: true } } },
  });
  return rows.map((row) => row.product.slug);
}

async function recordAudit(
  promotionId: string,
  actor: PromotionProductActor | undefined,
  count: number,
  on: boolean,
): Promise<void> {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action: AUDIT_ACTIONS.PROMOTION_PRODUCTS_UPDATE,
    entityType: "Promotion",
    entityId: promotionId,
    ip: actor.ip,
    metadata: { count, on },
  });
}

export async function assignPromotionProducts(input: {
  promotionId: string;
  productIds: string[];
  actor?: PromotionProductActor;
}): Promise<PromotionProductMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: PROMOTION_PRODUCTS_DB_REQUIRED };
  }

  const ids = [
    ...new Set(input.productIds.map((id) => id.trim()).filter(Boolean)),
  ].slice(0, PRODUCT_CAP);
  if (ids.length === 0) {
    return { ok: false, formError: "Select at least one product." };
  }

  const promotion = await getPrisma().promotion.findUnique({
    where: { id: input.promotionId },
    select: { id: true },
  });
  if (!promotion) {
    return { ok: false, formError: "That promotion no longer exists." };
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

  const existingCount = await getPrisma().promotionProduct.count({
    where: { promotionId: input.promotionId },
  });
  await getPrisma().promotionProduct.createMany({
    data: ids.map((productId, index) => ({
      promotionId: input.promotionId,
      productId,
      position: existingCount + index,
    })),
    skipDuplicates: true,
  });

  await recordAudit(input.promotionId, input.actor, ids.length, true);
  return { ok: true };
}

async function removeProducts(
  promotionId: string,
  productIds: string[],
  actor: PromotionProductActor | undefined,
): Promise<PromotionProductMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: PROMOTION_PRODUCTS_DB_REQUIRED };
  }

  const ids = [
    ...new Set(productIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (ids.length === 0) {
    return { ok: false, formError: "Select at least one product." };
  }

  await getPrisma().promotionProduct.deleteMany({
    where: { promotionId, productId: { in: ids } },
  });

  await recordAudit(promotionId, actor, ids.length, false);
  return { ok: true };
}

export async function removePromotionProduct(input: {
  promotionId: string;
  productId: string;
  actor?: PromotionProductActor;
}): Promise<PromotionProductMutationResult> {
  return removeProducts(input.promotionId, [input.productId], input.actor);
}

export async function removePromotionProducts(input: {
  promotionId: string;
  productIds: string[];
  actor?: PromotionProductActor;
}): Promise<PromotionProductMutationResult> {
  return removeProducts(input.promotionId, input.productIds, input.actor);
}
