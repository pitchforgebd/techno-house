import type { Money } from "@/lib/data/types/common";

export type DashboardTopCustomer = {
  id: string;
  initials: string;
  name: string;
};

export type DashboardRankedItem = {
  id: string;
  name: string;
  value: Money;
  /** Share of all-time paid revenue across every category/brand, not just the top 5. */
  sharePercent: number;
};

export type DashboardOrderStatusRow = {
  id: string;
  label: string;
  count: number;
  percent: number;
  tone: "pink" | "green" | "blue" | "cyan" | "yellow" | "red";
};

export type DashboardTopProduct = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  total: Money;
};

export type DashboardRecentOrder = {
  id: string;
  number: string;
  customer: string;
  placedAt: string;
  total: Money;
  paymentStatus: "paid" | "unpaid" | "failed";
  fulfillmentStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
};

export type DashboardSnapshot = {
  customers: {
    total: number;
    newThisMonth: number;
    top: DashboardTopCustomer[];
  };
  products: {
    total: number;
    published: number;
    draft: number;
    lowStock: number;
  };
  sales: {
    allTime: Money;
    thisMonth: Money;
    /** Percent change of this month's paid sales vs last month's. Null when last month had no paid sales (nothing to compare against). */
    growthPercent: number | null;
    /** Real day-by-day paid sales for the last 14 days, oldest first. */
    trend: { label: string; value: number }[];
  };
  orders: {
    total: number;
    thisMonth: number;
    averageOrderValue: Money;
    fulfillmentRate: number;
    statuses: DashboardOrderStatusRow[];
  };
  inventoryAlert: {
    label: string;
    value: number;
    hint: string;
    href: string;
  };
  categories: {
    total: number;
    top: DashboardRankedItem[];
  };
  brands: {
    total: number;
    top: DashboardRankedItem[];
  };
  topProducts: DashboardTopProduct[];
  recentOrders: DashboardRecentOrder[];
};
