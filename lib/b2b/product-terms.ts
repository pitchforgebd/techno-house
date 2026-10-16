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

export type AdminB2BProductTerms = {
  priceAmount: number;
  minQuantity: number;
  isActive: boolean;
};

/** Admin-side read of a product's wholesale row regardless of active state —
 * unlike `getB2BTermsForProductId`, which only ever returns an active row
 * (that one feeds live pricing; this one feeds the admin edit form, which
 * needs to see a disabled row too so the toggle can reflect it). */
export async function getAdminB2BProductTerms(
  productId: string,
): Promise<AdminB2BProductTerms | null> {
  if (!productId) {
    return null;
  }
  const row = await getPrisma().b2BProductPrice.findUnique({
    where: { productId },
    select: { priceAmount: true, minQuantity: true, isActive: true },
  });
  return row
    ? {
        priceAmount: row.priceAmount,
        minQuantity: row.minQuantity,
        isActive: row.isActive,
      }
    : null;
}

/** True when the product has ANY active wholesale row — used to decide
 * whether the storefront shows its B2B/wholesale entry point at all. */
export async function isProductB2BEligible(productId: string): Promise<boolean> {
  if (!productId) {
    return false;
  }
  const row = await getPrisma().b2BProductPrice.findFirst({
    where: { productId, isActive: true },
    select: { productId: true },
  });
  return row !== null;
}

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

/**
 * Admin-side write.
 *
 * `enabled` is the explicit toggle — Catalog → Products (per-product) and
 * the bulk B2B pricing list both surface it directly now, replacing the old
 * implicit "price <= 0 deletes the row" convention. Disabling keeps the
 * stored price/min-qty (an admin flipping it back on a week later doesn't
 * have to retype them) — it's still gone from the storefront and the B2B
 * product list the moment `isActive` is false, since every reader
 * (`getB2BTermsForProductId`, `isProductB2BEligible`, `listAdminB2BPricing`)
 * filters on `isActive: true`. `priceAmount <= 0` with `enabled: true` is
 * still rejected — there is no such thing as an active row with no price.
 */
export async function saveB2BProductTerms(input: {
  productId: string;
  priceAmount: number;
  minQuantity: number;
  enabled: boolean;
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

  if (!input.enabled) {
    // No row ever existed and the admin is just unchecking the toggle on an
    // already-blank widget — nothing to do, not an error.
    await getPrisma().b2BProductPrice.updateMany({
      where: { productId },
      data: { isActive: false },
    });
    return { ok: true };
  }

  if (!Number.isFinite(input.priceAmount) || input.priceAmount <= 0) {
    return {
      ok: false,
      formError: "Enter a wholesale price greater than zero to enable B2B pricing.",
    };
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
