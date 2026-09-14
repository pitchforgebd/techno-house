/**
 * Admin inventory persistence (P12-T05).
 *
 * ProductStock.quantity is the source of truth. Product.stockStatus is
 * denormalised from available = quantity - reserved.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  deriveStockStatus,
  parseInventoryInput,
  type InventoryInputFields,
} from "@/lib/catalog/inventory-input";
import { toDbStockStatus } from "@/lib/data/prisma/mappers";
import { getPrisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  ProductMutationResult,
  ProductActor,
} from "@/lib/catalog/admin-products";

export const INVENTORY_DB_REQUIRED =
  "Inventory changes need the database. Turn off DATA_SOURCE=mock to save.";

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function upsertProductStock(
  input: {
    productId: string;
    quantity: number;
    lowStockThreshold: number;
    variantStocks?: { variantId: string; quantity: number }[];
  },
  /** Pass the `tx` from an enclosing `$transaction` to make this write atomic
   * with the rest of a multi-table save; defaults to a standalone client for
   * callers (like `updateAdminProductStock`) that don't need that. */
  db: Prisma.TransactionClient | ReturnType<typeof getPrisma> = getPrisma(),
): Promise<
  | { ok: true; stockStatus: ReturnType<typeof deriveStockStatus> }
  | { ok: false; formError: string }
> {
  const prisma = db;
  const existing = await prisma.productStock.findUnique({
    where: { productId: input.productId },
    select: { reserved: true },
  });
  const reserved = existing?.reserved ?? 0;
  if (input.quantity < reserved) {
    return {
      ok: false,
      formError: "Quantity cannot be below reserved units.",
    };
  }

  await prisma.productStock.upsert({
    where: { productId: input.productId },
    create: {
      productId: input.productId,
      quantity: input.quantity,
      reserved: 0,
      lowStockThreshold: input.lowStockThreshold,
    },
    update: {
      quantity: input.quantity,
      lowStockThreshold: input.lowStockThreshold,
    },
  });

  for (const variant of input.variantStocks ?? []) {
    const variantRow = await prisma.productStock.findUnique({
      where: { variantId: variant.variantId },
      select: { reserved: true },
    });
    const variantReserved = variantRow?.reserved ?? 0;
    if (variant.quantity < variantReserved) {
      return {
        ok: false,
        formError: "A variant quantity cannot be below reserved units.",
      };
    }
    await prisma.productStock.upsert({
      where: { variantId: variant.variantId },
      create: {
        variantId: variant.variantId,
        quantity: variant.quantity,
        reserved: 0,
        lowStockThreshold: input.lowStockThreshold,
      },
      update: {
        quantity: variant.quantity,
        lowStockThreshold: input.lowStockThreshold,
      },
    });
  }

  const stockStatus = deriveStockStatus(
    input.quantity,
    reserved,
    input.lowStockThreshold,
  );
  await prisma.product.update({
    where: { id: input.productId },
    data: { stockStatus: toDbStockStatus(stockStatus) },
  });
  return { ok: true, stockStatus };
}

export async function updateAdminProductStock(input: {
  productId: string;
  fields: InventoryInputFields;
  actor?: ProductActor;
}): Promise<ProductMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: INVENTORY_DB_REQUIRED };
  }
  const parsed = parseInventoryInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }

  const existing = await getPrisma().product.findUnique({
    where: { id: input.productId.trim() },
    select: { id: true, slug: true, name: true },
  });
  if (!existing) {
    return { ok: false, formError: "That product no longer exists." };
  }

  const synced = await upsertProductStock({
    productId: existing.id,
    quantity: parsed.value.quantity,
    lowStockThreshold: parsed.value.lowStockThreshold,
  });
  if (!synced.ok) {
    return synced;
  }

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.INVENTORY_UPDATE,
      entityType: "ProductStock",
      entityId: existing.id,
      ip: input.actor.ip,
      metadata: {
        slug: existing.slug,
        name: existing.name,
        quantity: parsed.value.quantity,
        lowStockThreshold: parsed.value.lowStockThreshold,
        stockStatus: synced.stockStatus,
      },
    });
  }

  return { ok: true, id: existing.id, slug: existing.slug };
}

export type AdminStockReportRow = {
  id: string;
  name: string;
  categorySlug: string;
  value: number;
};

export async function listAdminStockReportRows(
  categorySlug?: string,
): Promise<AdminStockReportRow[]> {
  const prisma = getPrisma();
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: { select: { slug: true } },
      stock: { select: { quantity: true, reserved: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    categorySlug: row.category.slug,
    value: Math.max(0, (row.stock?.quantity ?? 0) - (row.stock?.reserved ?? 0)),
  }));
}
