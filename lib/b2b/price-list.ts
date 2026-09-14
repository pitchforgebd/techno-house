/**
 * The signed-in wholesale buyer's own price list — server only.
 *
 * This is a B2B-only view of the catalogue: retail price beside what this
 * account actually pays, plus the order minimum. It resolves each line the
 * same way the product page and `create-order` do, through
 * `resolveB2BPricing`, so the list can never quote a number the checkout
 * would not honour.
 *
 * Returns an empty list unless the account is ACTIVE. A pending or suspended
 * account has no wholesale pricing, and must not be shown any.
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getMyB2BAccount } from "@/lib/b2b/applications";
import { resolveB2BPricing } from "@/lib/b2b/pricing";
import { getB2BTermsForProductIds } from "@/lib/b2b/product-terms";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";
import type { Money } from "@/lib/data/types/common";

export type B2BPriceLine = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  categoryName: string;
  retail: Money;
  wholesale: Money;
  minQuantity: number;
  /** True when an admin set a price for this product specifically. */
  negotiated: boolean;
  savedAmount: number;
};

export type B2BPriceList = {
  company: string;
  discountPercent: number;
  tier: string | null;
  lines: B2BPriceLine[];
};

const PAGE_LIMIT = 200;

export async function getMyB2BPriceList(): Promise<B2BPriceList | null> {
  const session = await getCustomerSession();
  if (!session || !usesDatabase()) {
    return null;
  }
  const account = await getMyB2BAccount(session.userId);
  if (!account || account.status !== "ACTIVE") {
    return null;
  }

  const products = await getPrisma().product.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }],
    take: PAGE_LIMIT,
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      priceAmount: true,
      category: { select: { name: true } },
    },
  });

  const terms = await getB2BTermsForProductIds(products.map((p) => p.id));

  const lines = products.map((product) => {
    const retail: Money = { amount: product.priceAmount, currency: "BDT" };
    const pricing = resolveB2BPricing({
      retail,
      discountPercent: account.discountPercent,
      terms: terms.get(product.id) ?? null,
    });
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      categoryName: product.category?.name ?? "",
      retail,
      wholesale: pricing.price,
      minQuantity: pricing.minQuantity,
      negotiated: pricing.fromProductTerms,
      savedAmount: Math.max(0, retail.amount - pricing.price.amount),
    };
  });

  return {
    company: account.company,
    discountPercent: account.discountPercent,
    tier: account.tier,
    // Products where wholesale saves nothing are noise on a price list.
    lines: lines.filter((line) => line.savedAmount > 0),
  };
}
