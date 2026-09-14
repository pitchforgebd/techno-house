/**
 * Admin dashboard snapshot from PostgreSQL (live catalogue + sales).
 */
import type { Money } from "@/lib/data/types/common";
import type { DashboardSnapshot } from "@/lib/admin/dashboard-types";
import { fillBuckets, planCustomRangeBuckets } from "@/lib/admin/report-time-buckets";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

function money(amount: number): Money {
  return { amount, currency: "BDT" };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

function share(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 1000) / 10;
}

function emptySnapshot(): DashboardSnapshot {
  const zeroStatuses: DashboardSnapshot["orders"]["statuses"] = [
    { id: "pending", label: "Pending", count: 0, percent: 0, tone: "pink" },
    { id: "processing", label: "Processing", count: 0, percent: 0, tone: "blue" },
    { id: "shipped", label: "Shipped", count: 0, percent: 0, tone: "cyan" },
    { id: "delivered", label: "Delivered", count: 0, percent: 0, tone: "yellow" },
    { id: "cancelled", label: "Cancelled", count: 0, percent: 0, tone: "red" },
  ];
  return {
    customers: { total: 0, newThisMonth: 0, top: [] },
    products: { total: 0, published: 0, draft: 0, lowStock: 0 },
    sales: { allTime: money(0), thisMonth: money(0), growthPercent: null, trend: [] },
    orders: {
      total: 0,
      thisMonth: 0,
      averageOrderValue: money(0),
      fulfillmentRate: 0,
      statuses: zeroStatuses,
    },
    inventoryAlert: {
      label: "Low-stock SKUs",
      value: 0,
      hint: "Needs replenishment review",
      href: "/admin/products",
    },
    categories: { total: 0, top: [] },
    brands: { total: 0, top: [] },
    topProducts: [],
    recentOrders: [],
  };
}

export async function loadAdminDashboard(): Promise<DashboardSnapshot> {
  if (!usesDatabase()) {
    return emptySnapshot();
  }

  const prisma = getPrisma();
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const lastMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
  );
  const trendPlan = planCustomRangeBuckets(
    new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
    now,
  );

  const [
    customerTotal,
    newCustomersThisMonth,
    topCustomers,
    productTotal,
    publishedProducts,
    lowStock,
    categoryTotal,
    brandTotal,
    orderTotal,
    ordersThisMonth,
    statusGroups,
    paidOrderCount,
    paidSum,
    monthPaidSum,
    lastMonthPaidSum,
    trendRows,
    recentRows,
    topProductRows,
    categorySalesRows,
    brandSalesRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fullName: true },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { stockStatus: "LOW_STOCK" } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.brand.count({ where: { isActive: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { placedAt: { gte: monthStart } } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.count({ where: { paymentStatus: "PAID" } }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", placedAt: { gte: monthStart } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: "PAID",
        placedAt: { gte: lastMonthStart, lt: monthStart },
      },
      _sum: { totalAmount: true },
    }),
    prisma.$queryRaw<{ bucket: Date; total: number }[]>`
      SELECT date_trunc('day', "placedAt") AS bucket,
             COALESCE(SUM("totalAmount"), 0)::float8 AS total
      FROM "Order"
      WHERE "paymentStatus" = 'PAID'
        AND "placedAt" >= ${trendPlan.start} AND "placedAt" < ${trendPlan.end}
      GROUP BY bucket
    `,
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 8,
      select: {
        id: true,
        number: true,
        customerName: true,
        placedAt: true,
        totalAmount: true,
        paymentStatus: true,
        status: true,
      },
    }),
    prisma.$queryRaw<
      { product_id: string | null; name: string; category_name: string | null; qty: number; total: number }[]
    >`
      SELECT oi."productId" AS product_id, oi."productName" AS name,
             c.name AS category_name,
             SUM(oi.quantity)::int AS qty,
             COALESCE(SUM(oi."totalAmount"), 0)::float8 AS total
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      LEFT JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE o."paymentStatus" = 'PAID'
      GROUP BY oi."productId", oi."productName", c.name
      ORDER BY total DESC
      LIMIT 6
    `,
    prisma.$queryRaw<{ id: string; name: string; total: number }[]>`
      SELECT c.id, c.name, COALESCE(SUM(oi."totalAmount"), 0)::float8 AS total
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE o."paymentStatus" = 'PAID'
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 5
    `,
    prisma.$queryRaw<{ id: string; name: string; total: number }[]>`
      SELECT b.id, b.name, COALESCE(SUM(oi."totalAmount"), 0)::float8 AS total
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Brand" b ON b.id = p."brandId"
      WHERE o."paymentStatus" = 'PAID'
      GROUP BY b.id, b.name
      ORDER BY total DESC
      LIMIT 5
    `,
  ]);

  const statusCount = (key: string) =>
    statusGroups.find((row) => row.status === key)?._count._all ?? 0;

  const pending = statusCount("PENDING");
  const processing = statusCount("PROCESSING");
  const shipped = statusCount("SHIPPED");
  const delivered = statusCount("DELIVERED");
  const cancelled = statusCount("CANCELLED");
  const totalForPct = Math.max(1, orderTotal);
  const statuses: DashboardSnapshot["orders"]["statuses"] = [
    { id: "pending", label: "Pending", count: pending, percent: share(pending, totalForPct), tone: "pink" },
    { id: "processing", label: "Processing", count: processing, percent: share(processing, totalForPct), tone: "blue" },
    { id: "shipped", label: "Shipped", count: shipped, percent: share(shipped, totalForPct), tone: "cyan" },
    { id: "delivered", label: "Delivered", count: delivered, percent: share(delivered, totalForPct), tone: "yellow" },
    { id: "cancelled", label: "Cancelled", count: cancelled, percent: share(cancelled, totalForPct), tone: "red" },
  ];

  const fulfillmentRate =
    orderTotal === 0 ? 0 : share(delivered + shipped, orderTotal);

  const allTimeSales = paidSum._sum.totalAmount ?? 0;
  const monthSales = monthPaidSum._sum.totalAmount ?? 0;
  const lastMonthSales = lastMonthPaidSum._sum.totalAmount ?? 0;
  const growthPercent =
    lastMonthSales > 0
      ? Math.round(((monthSales - lastMonthSales) / lastMonthSales) * 1000) / 10
      : null;
  const averageOrderValue =
    paidOrderCount > 0 ? Math.round(allTimeSales / paidOrderCount) : 0;
  const draft = Math.max(0, productTotal - publishedProducts);

  const recentOrders: DashboardSnapshot["recentOrders"] = recentRows.map((row) => {
    const paymentStatus: "paid" | "unpaid" | "failed" =
      row.paymentStatus === "PAID"
        ? "paid"
        : row.paymentStatus === "FAILED" || row.paymentStatus === "CANCELLED"
          ? "failed"
          : "unpaid";
    const fulfillmentStatus: DashboardSnapshot["recentOrders"][number]["fulfillmentStatus"] =
      row.status === "DELIVERED"
        ? "delivered"
        : row.status === "SHIPPED"
          ? "shipped"
          : row.status === "PROCESSING"
            ? "processing"
            : row.status === "CANCELLED"
              ? "cancelled"
              : "pending";
    return {
      id: row.id,
      number: row.number,
      customer: row.customerName,
      placedAt: row.placedAt
        .toLocaleString("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(",", " ·"),
      total: money(row.totalAmount),
      paymentStatus,
      fulfillmentStatus,
    };
  });

  const topProducts: DashboardSnapshot["topProducts"] = topProductRows
    .slice(0, 5)
    .map((row, index) => ({
      id: row.product_id ?? `tp-${index + 1}`,
      name: row.name,
      category: row.category_name ?? "—",
      quantity: row.qty,
      total: money(row.total),
    }));

  const categories: DashboardSnapshot["categories"]["top"] = categorySalesRows.map((row) => ({
    id: row.id,
    name: row.name,
    value: money(row.total),
    sharePercent: share(row.total, allTimeSales),
  }));

  const brands: DashboardSnapshot["brands"]["top"] = brandSalesRows.map((row) => ({
    id: row.id,
    name: row.name,
    value: money(row.total),
    sharePercent: share(row.total, allTimeSales),
  }));

  return {
    customers: {
      total: customerTotal,
      newThisMonth: newCustomersThisMonth,
      top: topCustomers.map((user) => ({
        id: user.id,
        initials: initials(user.fullName),
        name: user.fullName,
      })),
    },
    products: {
      total: productTotal,
      published: publishedProducts,
      draft,
      lowStock,
    },
    sales: {
      allTime: money(allTimeSales),
      thisMonth: money(monthSales),
      growthPercent,
      trend: fillBuckets(trendPlan, trendRows),
    },
    orders: {
      total: orderTotal,
      thisMonth: ordersThisMonth,
      averageOrderValue: money(averageOrderValue),
      fulfillmentRate,
      statuses,
    },
    inventoryAlert: {
      label: "Low-stock SKUs",
      value: lowStock,
      hint: "Needs replenishment review",
      href: "/admin/products",
    },
    categories: { total: categoryTotal, top: categories },
    brands: { total: brandTotal, top: brands },
    topProducts,
    recentOrders,
  };
}
