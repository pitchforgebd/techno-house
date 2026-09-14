/**
 * Custom Sale Alert — a rotating "Someone from {area} bought {product}"
 * storefront toast (Admin → Marketing → Custom Sale Alert, AD-260).
 *
 * Driven entirely by real OrderItem rows — never fabricated purchase
 * events. Never shows the customer's name, email, or phone; only the
 * real shipping area name (e.g. "Dhamrai — Dhaka"), so no purchaser
 * identity is exposed to anonymous storefront visitors. Timestamps shown
 * are the real order date — never faked as "just now" for an old order.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type SaleAlertProductScope = "featured" | "sale" | "manual";

export type SaleAlertSettingsView = {
  enabled: boolean;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  productScope: SaleAlertProductScope;
  manualProductIds: string[];
};

const DEFAULTS: SaleAlertSettingsView = {
  enabled: false,
  minIntervalSeconds: 15,
  maxIntervalSeconds: 45,
  productScope: "featured",
  manualProductIds: [],
};

function toScope(value: string): SaleAlertProductScope {
  return value === "sale" || value === "manual" ? value : "featured";
}

export async function getSaleAlertSettings(): Promise<SaleAlertSettingsView> {
  const row = await getPrisma().saleAlertSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return { ...DEFAULTS };
  }
  return {
    enabled: row.enabled,
    minIntervalSeconds: row.minIntervalSeconds,
    maxIntervalSeconds: row.maxIntervalSeconds,
    productScope: toScope(row.productScope),
    manualProductIds: row.manualProductIds,
  };
}

export type SaveResult = { ok: true } | { ok: false; formError: string };

export async function saveSaleAlertSettings(input: {
  enabled: boolean;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  productScope: SaleAlertProductScope;
  manualProductIds: string[];
  actor: { staffId: string; email: string; ip?: string | null };
}): Promise<SaveResult> {
  if (
    !Number.isInteger(input.minIntervalSeconds) ||
    input.minIntervalSeconds < 5 ||
    input.minIntervalSeconds > 3600
  ) {
    return { ok: false, formError: "Min interval must be between 5 and 3600 seconds." };
  }
  if (
    !Number.isInteger(input.maxIntervalSeconds) ||
    input.maxIntervalSeconds < input.minIntervalSeconds ||
    input.maxIntervalSeconds > 3600
  ) {
    return {
      ok: false,
      formError: "Max interval must be at least the min interval, up to 3600 seconds.",
    };
  }

  const manualProductIds = [...new Set(input.manualProductIds)].slice(0, 100);

  await getPrisma().saleAlertSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      enabled: input.enabled,
      minIntervalSeconds: input.minIntervalSeconds,
      maxIntervalSeconds: input.maxIntervalSeconds,
      productScope: input.productScope,
      manualProductIds,
    },
    update: {
      enabled: input.enabled,
      minIntervalSeconds: input.minIntervalSeconds,
      maxIntervalSeconds: input.maxIntervalSeconds,
      productScope: input.productScope,
      manualProductIds,
    },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.SALE_ALERT_SETTINGS_UPDATE,
    entityType: "SaleAlertSettings",
    entityId: "singleton",
    ip: input.actor.ip,
  });

  return { ok: true };
}

export type PickableProduct = { id: string; name: string; sku: string };

export async function listPickableProducts(): Promise<PickableProduct[]> {
  const rows = await getPrisma().product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    take: 500,
    select: { id: true, name: true, sku: true },
  });
  return rows;
}

async function resolveScopeProductIds(
  settings: SaleAlertSettingsView,
): Promise<string[] | null> {
  const prisma = getPrisma();
  if (settings.productScope === "sale") {
    const rows = await prisma.product.findMany({
      where: { isActive: true, isSale: true },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
  if (settings.productScope === "manual") {
    return settings.manualProductIds;
  }
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    take: 20,
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export type SaleAlertEvent = {
  productName: string;
  productSlug: string | null;
  areaLabel: string | null;
  placedAt: string;
};

export async function getRecentSaleAlertEvents(limit = 20): Promise<SaleAlertEvent[]> {
  const settings = await getSaleAlertSettings();
  if (!settings.enabled) {
    return [];
  }

  const scopeIds = await resolveScopeProductIds(settings);
  if (scopeIds && scopeIds.length === 0) {
    return [];
  }

  const items = await getPrisma().orderItem.findMany({
    where: {
      ...(scopeIds ? { productId: { in: scopeIds } } : {}),
      order: { status: { not: "CANCELLED" } },
    },
    orderBy: { order: { placedAt: "desc" } },
    take: limit,
    select: {
      productName: true,
      product: { select: { slug: true } },
      order: {
        select: {
          placedAt: true,
          shippingArea: { select: { name: true } },
        },
      },
    },
  });

  return items.map((item) => ({
    productName: item.productName,
    productSlug: item.product?.slug ?? null,
    areaLabel: item.order.shippingArea?.name ?? null,
    placedAt: item.order.placedAt.toISOString(),
  }));
}
