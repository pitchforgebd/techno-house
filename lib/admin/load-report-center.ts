import {
  brandRepository,
  categoryRepository,
  productRepository,
} from "@/lib/data";
import { listAdminStockReportRows } from "@/lib/catalog/admin-inventory";
import { usesCatalogDatabase } from "@/lib/catalog/admin-products";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";
import {
  currentCalendarMonthRange,
  fillBuckets,
  planCustomRangeBuckets,
  planReportBuckets,
} from "@/lib/admin/report-time-buckets";
import { type ReportPeriod, type UserSearchRow } from "@/lib/admin/report-center-mock";

export type ReportNamedCount = {
  id: string;
  name: string;
  categorySlug: string;
  value: number;
  secondaryValue?: number;
};

export type EarningReportSnapshot = {
  totalSales: number;
  salesThisMonth: number;
  refunds: number;
  refundsThisMonth: number;
  orderCount: number;
  averageOrderValue: number;
  categoryCount: number;
  brandCount: number;
  topBrand: string;
  netSales: { label: string; value: number }[];
  expenses: { label: string; value: number }[];
  saleSeries: { label: string; value: number }[];
  refundSeries: { label: string; value: number }[];
};

function hash(id: string, max: number): number {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) {
    n = (n + id.charCodeAt(i) * (i + 1)) % (max + 1);
  }
  return n;
}

const REFUND_CHANNEL_LABEL: Record<string, string> = {
  WALLET: "Wallet",
  OFFLINE: "Offline / Cash",
  GATEWAY: "Gateway",
};

/**
 * Real revenue/refund accounting from PostgreSQL (AD-270). "Sales" only
 * counts orders with paymentStatus PAID — an unpaid or cancelled order is
 * not real revenue. "Refunds" only counts Refund rows with status
 * COMPLETED — a requested/approved-but-not-paid-out refund hasn't actually
 * left the business yet. netSales is built from the same fields that sum
 * to Order.totalAmount (subtotal - discount + shipping + tax), so it can
 * never drift from the real total. period scopes every figure except the
 * *ThisMonth pair, which is always the current calendar month regardless
 * of the selected tab (a fixed secondary reference point).
 */
export async function loadEarningReport(
  period: ReportPeriod = "all",
  customRange?: { from: Date; to: Date },
): Promise<EarningReportSnapshot> {
  const [categories, brands] = await Promise.all([
    categoryRepository.list(),
    brandRepository.list(),
  ]);
  const categoryCount = categories.length;
  const brandCount = brands.length;
  const fallbackBrand = brands[0]?.name ?? "Techno House";

  if (!usesDatabase()) {
    return {
      totalSales: 0,
      salesThisMonth: 0,
      refunds: 0,
      refundsThisMonth: 0,
      orderCount: 0,
      averageOrderValue: 0,
      categoryCount,
      brandCount,
      topBrand: fallbackBrand,
      netSales: [
        { label: "Product Sales", value: 0 },
        { label: "Delivery", value: 0 },
      ],
      expenses: [{ label: "Refunds", value: 0 }],
      saleSeries: [],
      refundSeries: [],
    };
  }

  const prisma = getPrisma();
  const plan = customRange
    ? planCustomRangeBuckets(customRange.from, customRange.to)
    : planReportBuckets(period);
  const thisMonth = currentCalendarMonthRange();

  const [
    periodPaidAgg,
    monthPaidAgg,
    periodRefundAgg,
    monthRefundAgg,
    periodOrderCount,
    channelGroups,
    saleBucketRows,
    refundBucketRows,
    topBrandRows,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", placedAt: { gte: plan.start, lt: plan.end } },
      _sum: {
        totalAmount: true,
        subtotalAmount: true,
        discountAmount: true,
        shippingAmount: true,
        taxAmount: true,
      },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: "PAID",
        placedAt: { gte: thisMonth.start, lt: thisMonth.end },
      },
      _sum: { totalAmount: true },
    }),
    prisma.refund.aggregate({
      where: { status: "COMPLETED", resolvedAt: { gte: plan.start, lt: plan.end } },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: {
        status: "COMPLETED",
        resolvedAt: { gte: thisMonth.start, lt: thisMonth.end },
      },
      _sum: { amount: true },
    }),
    prisma.order.count({
      where: { paymentStatus: "PAID", placedAt: { gte: plan.start, lt: plan.end } },
    }),
    prisma.refund.groupBy({
      by: ["channel"],
      where: { status: "COMPLETED", resolvedAt: { gte: plan.start, lt: plan.end } },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<{ bucket: Date; total: number }[]>`
      SELECT date_trunc(${plan.granularity}, "placedAt") AS bucket,
             COALESCE(SUM("totalAmount"), 0)::float8 AS total
      FROM "Order"
      WHERE "paymentStatus" = 'PAID'
        AND "placedAt" >= ${plan.start} AND "placedAt" < ${plan.end}
      GROUP BY bucket
    `,
    prisma.$queryRaw<{ bucket: Date; total: number }[]>`
      SELECT date_trunc(${plan.granularity}, "resolvedAt") AS bucket,
             COALESCE(SUM(amount), 0)::float8 AS total
      FROM "Refund"
      WHERE status = 'COMPLETED'
        AND "resolvedAt" >= ${plan.start} AND "resolvedAt" < ${plan.end}
      GROUP BY bucket
    `,
    prisma.$queryRaw<{ brand_name: string | null; total: number }[]>`
      SELECT b.name AS brand_name, COALESCE(SUM(oi."totalAmount"), 0)::float8 AS total
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      LEFT JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Brand" b ON b.id = p."brandId"
      WHERE o."paymentStatus" = 'PAID'
        AND o."placedAt" >= ${plan.start} AND o."placedAt" < ${plan.end}
      GROUP BY b.name
      ORDER BY total DESC
      LIMIT 1
    `,
  ]);

  const totalSales = periodPaidAgg._sum.totalAmount ?? 0;
  const salesThisMonth = monthPaidAgg._sum.totalAmount ?? 0;
  const refunds = periodRefundAgg._sum.amount ?? 0;
  const refundsThisMonth = monthRefundAgg._sum.amount ?? 0;

  const productSales = Math.max(
    0,
    (periodPaidAgg._sum.subtotalAmount ?? 0) -
      (periodPaidAgg._sum.discountAmount ?? 0),
  );
  const delivery = periodPaidAgg._sum.shippingAmount ?? 0;
  const tax = periodPaidAgg._sum.taxAmount ?? 0;

  const netSales = [
    { label: "Product Sales", value: productSales },
    { label: "Delivery", value: delivery },
    ...(tax > 0 ? [{ label: "Tax", value: tax }] : []),
  ];

  const expenses =
    channelGroups.length > 0
      ? channelGroups
          .map((row) => ({
            label: REFUND_CHANNEL_LABEL[row.channel] ?? row.channel,
            value: row._sum.amount ?? 0,
          }))
          .sort((a, b) => b.value - a.value)
      : [{ label: "Refunds", value: 0 }];

  const topBrand = topBrandRows[0]?.brand_name ?? fallbackBrand;

  return {
    totalSales,
    salesThisMonth,
    refunds,
    refundsThisMonth,
    orderCount: periodOrderCount,
    averageOrderValue:
      periodOrderCount > 0 ? Math.round(totalSales / periodOrderCount) : 0,
    categoryCount,
    brandCount,
    topBrand,
    netSales,
    expenses,
    saleSeries: fillBuckets(plan, saleBucketRows),
    refundSeries: fillBuckets(plan, refundBucketRows),
  };
}

/**
 * Real per-product units sold + revenue from OrderItem (PAID orders only).
 * Every active catalog product is listed, including ones never sold (0),
 * so the report reflects the whole catalog, not just movers.
 */
export async function loadProductSaleRows(categorySlug: string): Promise<{
  rows: ReportNamedCount[];
  categories: { slug: string; name: string }[];
}> {
  const [catalog, categories] = await Promise.all([
    productRepository.list({ page: 1, pageSize: 500, sort: "featured" }),
    categoryRepository.list(),
  ]);
  let items = catalog.items;
  if (categorySlug) {
    items = items.filter((p) => p.categorySlug === categorySlug);
  }
  const categoryOptions = categories
    .map((c) => ({ slug: c.slug, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!usesDatabase()) {
    return {
      rows: items.map((p) => ({
        id: p.id,
        name: p.name,
        categorySlug: p.categorySlug,
        value: 0,
        secondaryValue: 0,
      })),
      categories: categoryOptions,
    };
  }

  const sold = await getPrisma().orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { paymentStatus: "PAID" } },
    _sum: { quantity: true, totalAmount: true },
  });
  const byProduct = new Map(
    sold
      .filter((row): row is typeof row & { productId: string } => row.productId != null)
      .map((row) => [row.productId, row]),
  );

  return {
    rows: items
      .map((p) => ({
        id: p.id,
        name: p.name,
        categorySlug: p.categorySlug,
        value: byProduct.get(p.id)?._sum.quantity ?? 0,
        secondaryValue: byProduct.get(p.id)?._sum.totalAmount ?? 0,
      }))
      .sort((a, b) => b.value - a.value),
    categories: categoryOptions,
  };
}

export async function loadProductStockRows(categorySlug: string): Promise<{
  rows: ReportNamedCount[];
  categories: { slug: string; name: string }[];
}> {
  const categories = await categoryRepository.list();
  const categoryOptions = categories
    .map((c) => ({ slug: c.slug, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (usesCatalogDatabase()) {
    const rows = await listAdminStockReportRows(categorySlug || undefined);
    return { rows, categories: categoryOptions };
  }

  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: "featured",
  });
  let items = catalog.items;
  if (categorySlug) {
    items = items.filter((p) => p.categorySlug === categorySlug);
  }
  return {
    rows: items.map((p) => ({
      id: p.id,
      name: p.name,
      categorySlug: p.categorySlug,
      value:
        p.stockStatus === "out_of_stock"
          ? 0
          : p.stockStatus === "low_stock"
            ? hash(p.id, 8) + 1
            : hash(p.id, 400) + 12,
    })),
    categories: categoryOptions,
  };
}

/**
 * Wishlist is intentionally NOT wired to real data (AD-270, operator
 * decision): the storefront wishlist is localStorage-only today ("saved on
 * this device only — not synced to an account yet"), so there is no real
 * per-account wishlist data in Postgres to report on. `available: false`
 * tells the UI to show an honest "not available yet" state instead of a
 * fake or silently-empty table. Revisit once the storefront wishlist is
 * synced to accounts (the Wishlist/WishlistItem models already exist).
 */
export async function loadWishlistRows(_categorySlug: string): Promise<{
  rows: ReportNamedCount[];
  categories: { slug: string; name: string }[];
  available: boolean;
}> {
  const categories = await categoryRepository.list();
  return {
    rows: [],
    categories: categories
      .map((c) => ({ slug: c.slug, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    available: false,
  };
}

/** Real search queries from SearchLog, grouped by exact (already-normalized) text. */
export async function loadUserSearches(): Promise<UserSearchRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  const groups = await getPrisma().searchLog.groupBy({
    by: ["query"],
    _count: { _all: true },
    orderBy: { _count: { query: "desc" } },
    take: 200,
  });
  return groups.map((row, index) => ({
    id: `search-${index}`,
    query: row.query,
    count: row._count._all,
  }));
}

export type WalletLedgerRow = {
  id: string;
  customerName: string;
  email: string;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  adjustedBy: string;
  createdAt: string;
};

/**
 * Real wallet ledger from WalletTransaction (AD-270). Every row here is an
 * admin-initiated balance adjustment (see lib/admin/save-customer.ts) —
 * there is no customer-facing wallet top-up flow, so this deliberately does
 * not claim to be "recharges via bKash/Nagad/Card."
 */
export async function loadWalletLedger(): Promise<WalletLedgerRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().walletTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      amount: true,
      balanceAfter: true,
      reason: true,
      createdByName: true,
      createdAt: true,
      user: { select: { fullName: true, email: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    customerName: row.user.fullName,
    email: row.user.email,
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    reason: row.reason,
    adjustedBy: row.createdByName ?? "—",
    createdAt: row.createdAt
      .toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(",", " ·"),
  }));
}

export function parseReportPeriod(raw: string): ReportPeriod {
  if (raw === "today" || raw === "week" || raw === "month") {
    return raw;
  }
  return "all";
}
