import type { Metadata } from "next";
import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { loadAdminDashboard } from "@/lib/admin/load-dashboard";
import {
  loadDashboardTrend,
  parseDashboardTrendRange,
} from "@/lib/admin/dashboard-trend";
import {
  loadProductSaleRows,
  loadUserSearches,
} from "@/lib/admin/load-report-center";
import { canAccessAdminPath } from "@/lib/auth/admin-route-permissions";
import { getStaffSession } from "@/lib/auth/staff-session";
import type { DashboardShortcut } from "@/features/admin/dashboard/admin-dashboard-shortcuts";
import type { AnalyticsSearchParams } from "@/lib/admin/analytics-list-params";

export const metadata: Metadata = {
  title: "Dashboard",
};

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

/** Candidates only — filtered against the signed-in staff's own permissions below. */
const SHORTCUT_CANDIDATES: DashboardShortcut[] = [
  { id: "product", label: "Add product", href: "/admin/products/new", icon: "product", tone: "blue" },
  { id: "coupon", label: "Add coupon", href: "/admin/coupons/new", icon: "coupon", tone: "pink" },
  { id: "customer", label: "Add customer", href: "/admin/customers/new", icon: "customer", tone: "purple" },
  { id: "orders", label: "All orders", href: "/admin/orders", icon: "orders", tone: "orange" },
  { id: "reports", label: "Reports", href: "/admin/reports", icon: "reports", tone: "green" },
];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const raw = await searchParams;
  const range = parseDashboardTrendRange(first(raw.range).trim());
  const from = first(raw.from).trim();
  const to = first(raw.to).trim();

  // Own session read, separate from `requireStaffSession()` in the panel
  // layout: that call is already `cache()`d per request, so this is the same
  // resolved session, not a second query — just reaching it here for
  // permission-filtered shortcuts and report panels.
  const session = await getStaffSession();
  const permissions = session?.permissions ?? [];
  const shortcuts = SHORTCUT_CANDIDATES.filter((shortcut) =>
    canAccessAdminPath(shortcut.href, permissions),
  );
  const canViewProductSales = canAccessAdminPath(
    "/admin/reports/product-sales",
    permissions,
  );
  const canViewSearches = canAccessAdminPath("/admin/reports/searches", permissions);

  const [data, trend, productSales, searches] = await Promise.all([
    loadAdminDashboard(),
    loadDashboardTrend(range, from, to),
    // Gated behind the SAME permission as the full report, and not even
    // queried when absent — a staff member without reports.product_sale
    // never has this data leave the database on their behalf.
    canViewProductSales
      ? loadProductSaleRows("")
      : Promise.resolve({ rows: [], categories: [] }),
    canViewSearches ? loadUserSearches() : Promise.resolve([]),
  ]);

  return (
    <AdminDashboard
      data={data}
      trend={trend}
      shortcuts={shortcuts}
      bestSellers={canViewProductSales ? productSales.rows : null}
      topSearches={canViewSearches ? searches : null}
      trendFormValues={{ from, to }}
    />
  );
}
