/**
 * Variant stock aggregate (AD-388).
 *
 * A product with active variants sells from its variants' own
 * `ProductStock` rows. Its product-level row is kept as the SUM of those
 * (quantity and reserved), so the admin list, low-stock alerts and the
 * denormalised `Product.stockStatus` used by listings ("in stock" filter)
 * stay right without every reader having to know about variants.
 *
 * Call it inside the same transaction as any write that moves a variant's
 * stock. A product with no active variants is left alone — its own row is
 * the source of truth.
 */
import { deriveStockStatus, DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/catalog/inventory-input";
import { toDbStockStatus } from "@/lib/data/prisma/mappers";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function syncVariantAggregateStock(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<boolean> {
  const variants = await tx.productVariant.findMany({
    where: { productId, isActive: true },
    select: { stock: { select: { quantity: true, reserved: true } } },
  });
  if (variants.length === 0) {
    return false;
  }
  const quantity = variants.reduce(
    (sum, variant) => sum + (variant.stock?.quantity ?? 0),
    0,
  );
  // Clamped so the row can never break ProductStock_reserved_within_quantity.
  const reserved = Math.min(
    quantity,
    variants.reduce((sum, variant) => sum + (variant.stock?.reserved ?? 0), 0),
  );
  const row = await tx.productStock.upsert({
    where: { productId },
    create: {
      productId,
      quantity,
      reserved,
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
    },
    update: { quantity, reserved },
    select: { lowStockThreshold: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      stockStatus: toDbStockStatus(
        deriveStockStatus(quantity, reserved, row.lowStockThreshold),
      ),
    },
  });
  return true;
}
