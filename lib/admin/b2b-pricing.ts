/**
 * Admin view of per-product wholesale terms (AD-B2B).
 *
 * Lists the live catalogue with whatever `B2BProductPrice` row each product
 * has, so the admin sets the wholesale price and order minimum next to the
 * retail price rather than guessing.
 */
import { getPrisma } from "@/lib/db/prisma";

export type AdminB2BPricingRow = {
  productId: string;
  name: string;
  sku: string;
  categoryName: string;
  retailAmount: number;
  b2bAmount: number | null;
  minQuantity: number;
};

export type AdminB2BPricingResult = {
  rows: AdminB2BPricingRow[];
  total: number;
  q: string;
};

export async function listAdminB2BPricing(input: {
  q?: string;
}): Promise<AdminB2BPricingResult> {
  const q = (input.q ?? "").trim();
  const prisma = getPrisma();
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { sku: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ name: "asc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        sku: true,
        priceAmount: true,
        category: { select: { name: true } },
        b2bPrice: {
          select: { priceAmount: true, minQuantity: true, isActive: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    q,
    total,
    rows: rows.map((row) => ({
      productId: row.id,
      name: row.name,
      sku: row.sku,
      categoryName: row.category?.name ?? "—",
      retailAmount: row.priceAmount,
      b2bAmount:
        row.b2bPrice && row.b2bPrice.isActive ? row.b2bPrice.priceAmount : null,
      minQuantity: row.b2bPrice?.minQuantity ?? 1,
    })),
  };
}
