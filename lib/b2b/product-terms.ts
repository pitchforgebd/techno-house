/**
 * Per-product wholesale terms (price + order minimum) — server only.
 *
 * Only ACTIVE (admin-verified) accounts ever get these. Callers must check
 * the account status first; nothing here does it for them, so keep the check
 * next to the place the price is shown or charged.
 */
import { getPrisma } from "@/lib/db/prisma";
import type { B2BProductTerms } from "@/lib/b2b/pricing";

export type B2BTermsByProductId = Map<string, B2BProductTerms>;

export async function getB2BTermsForProductIds(
  productIds: string[],
): Promise<B2BTermsByProductId> {
  const ids = [...new Set(productIds.filter(Boolean))];
  const map: B2BTermsByProductId = new Map();
  if (ids.length === 0) {
    return map;
  }
  const rows = await getPrisma().b2BProductPrice.findMany({
    where: { productId: { in: ids }, isActive: true },
    select: { productId: true, priceAmount: true, minQuantity: true },
  });
  for (const row of rows) {
    map.set(row.productId, {
      priceAmount: row.priceAmount,
      minQuantity: row.minQuantity,
    });
  }
  return map;
}

export async function getB2BTermsForProductId(
  productId: string,
): Promise<B2BProductTerms | null> {
  if (!productId) {
    return null;
  }
  const row = await getPrisma().b2BProductPrice.findFirst({
    where: { productId, isActive: true },
    select: { priceAmount: true, minQuantity: true },
  });
  return row
    ? { priceAmount: row.priceAmount, minQuantity: row.minQuantity }
    : null;
}

export type SaveB2BTermsResult = { ok: true } | { ok: false; formError: string };

/** Admin-side write. `priceAmount <= 0` clears the row (back to flat %). */
export async function saveB2BProductTerms(input: {
  productId: string;
  priceAmount: number;
  minQuantity: number;
}): Promise<SaveB2BTermsResult> {
  const productId = input.productId.trim();
  if (!productId) {
    return { ok: false, formError: "That product no longer exists." };
  }
  const product = await getPrisma().product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, formError: "That product no longer exists." };
  }

  if (!Number.isFinite(input.priceAmount) || input.priceAmount <= 0) {
    await getPrisma().b2BProductPrice.deleteMany({ where: { productId } });
    return { ok: true };
  }
  const priceAmount = Math.round(input.priceAmount);
  const minQuantity = Math.max(1, Math.round(input.minQuantity || 1));
  if (minQuantity > 100000) {
    return { ok: false, formError: "Minimum quantity is too large." };
  }

  await getPrisma().b2BProductPrice.upsert({
    where: { productId },
    create: { productId, priceAmount, minQuantity, isActive: true },
    update: { priceAmount, minQuantity, isActive: true },
  });
  return { ok: true };
}
