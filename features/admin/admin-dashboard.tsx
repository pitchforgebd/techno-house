import Link from "next/link";
import {
  AlertTriangle,
  LayoutGrid,
  Package,
  ShoppingBag,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  AdminDashboardCard,
  AdminDeltaBadge,
  AdminOrderStatusPanel,
  AdminStatIcon,
  AdminTrendChart,
} from "@/features/admin/dashboard/admin-dashboard-widgets";
import type {
  DashboardRankedItem,
  DashboardRecentOrder,
  DashboardSnapshot,
} from "@/lib/admin/dashboard-types";
import { formatMoney } from "@/lib/format/currency";

const PAYMENT_BADGE: Record<DashboardRecentOrder["paymentStatus"], string> = {
  paid: "bg-emerald-50 text-emerald-700",
  unpaid: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
};

const FULFILLMENT_BADGE: Record<DashboardRecentOrder["fulfillmentStatus"], string> = {
  pending: "bg-surface-muted text-text-muted",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-cyan-50 text-cyan-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
};

function RankedRevenueList({ items }: { items: DashboardRankedItem[] }) {
  if (items.length === 0) {
    return <p className="text-caption text-text-muted">No paid orders yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.id}>
          <div className="mb-1 flex items-center justify-between gap-2 text-caption">
            <span className="flex min-w-0 items-center gap-2 text-text">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-text-muted">
                {index + 1}
              </span>
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-text">{formatMoney(item.value)}</span>{" "}
              <span className="text-text-muted">· {item.sharePercent}%</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.max(item.sharePercent, item.value.amount > 0 ? 2 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard({ data }: { data: DashboardSnapshot }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Dashboard
        </h1>
      </div>

      {/* Row 1 — KPI summary */}
      <div className="grid gap-4 xl:grid-cols-4">
        <AdminDashboardCard>
          <div className="flex gap-4">
            <AdminStatIcon tone="blue">
              <Wallet className="size-6" aria-hidden />
            </AdminStatIcon>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-text-muted">Total revenue</p>
              <p className="mt-1 truncate text-3xl font-bold tabular-nums text-text">
                {formatMoney(data.sales.allTime)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AdminDeltaBadge percent={data.sales.growthPercent} />
            <span className="text-caption text-text-muted">
              This month: {formatMoney(data.sales.thisMonth)}
            </span>
          </div>
        </AdminDashboardCard>

        <AdminDashboardCard>
          <div className="flex gap-4">
            <AdminStatIcon tone="orange">
              <ShoppingBag className="size-6" aria-hidden />
            </AdminStatIcon>
            <div>
              <p className="text-caption text-text-muted">All orders</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-text">
                {data.orders.total}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-caption">
            <div className="rounded-lg bg-surface-muted px-3 py-2">
              <p className="text-text-muted">This month</p>
              <p className="font-semibold tabular-nums text-text">
                {data.orders.thisMonth}
              </p>
            </div>
            <div className="rounded-lg bg-surface-muted px-3 py-2">
              <p className="text-text-muted">Avg. order</p>
              <p className="font-semibold tabular-nums text-text">
                {formatMoney(data.orders.averageOrderValue)}
              </p>
            </div>
          </div>
        </AdminDashboardCard>

        <AdminDashboardCard>
          <div className="flex gap-4">
            <AdminStatIcon tone="purple">
              <Users className="size-6" aria-hidden />
            </AdminStatIcon>
            <div className="min-w-0 flex-1">
              <p className="text-caption text-text-muted">Registered customers</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-text">
                {data.customers.total}
              </p>
            </div>
          </div>
          {data.customers.newThisMonth > 0 ? (
            <p className="mt-2 text-caption font-medium text-emerald-700">
              +{data.customers.newThisMonth} new this month
            </p>
          ) : null}
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-caption font-medium text-text-muted">Top customers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.customers.top.length > 0 ? (
                data.customers.top.map((customer) => (
                  <span
                    key={customer.id}
                    title={customer.name}
                    className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-caption font-semibold text-violet-700"
                  >
                    {customer.initials}
                  </span>
                ))
              ) : (
                <span className="text-caption text-text-muted">No customers yet.</span>
              )}
            </div>
          </div>
        </AdminDashboardCard>

        <AdminDashboardCard>
          <div className="flex gap-4">
            <AdminStatIcon tone="green">
              <Package className="size-6" aria-hidden />
            </AdminStatIcon>
            <div>
              <p className="text-caption text-text-muted">Total products</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-text">
                {data.products.total}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-caption">
            <div className="rounded-lg bg-surface-muted px-3 py-2">
              <p className="text-text-muted">Published</p>
              <p className="font-semibold tabular-nums text-text">
                {data.products.published}
              </p>
            </div>
            <div className="rounded-lg bg-surface-muted px-3 py-2">
              <p className="text-text-muted">Draft</p>
              <p className="font-semibold tabular-nums text-text">
                {data.products.draft}
              </p>
            </div>
          </div>
          {data.products.lowStock > 0 ? (
            <Link
              href={data.inventoryAlert.href}
              className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-caption font-medium text-orange-700 hover:bg-orange-100"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {data.products.lowStock} low-stock SKU{data.products.lowStock === 1 ? "" : "s"} — review →
            </Link>
          ) : null}
        </AdminDashboardCard>
      </div>

      {/* Row 2 — revenue trend */}
      <AdminDashboardCard>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-label font-semibold text-text">Revenue trend</h2>
            <p className="text-caption text-text-muted">Last 14 days · paid orders</p>
          </div>
          <AdminDeltaBadge percent={data.sales.growthPercent} />
        </div>
        <AdminTrendChart data={data.sales.trend} className="mt-4" />
      </AdminDashboardCard>

      {/* Row 3 — order status & recent orders */}
      <div className="grid gap-4 xl:grid-cols-3">
        <AdminDashboardCard>
          <div className="mb-4 flex items-center gap-3">
            <AdminStatIcon tone="blue">
              <ShoppingBag className="size-5" aria-hidden />
            </AdminStatIcon>
            <div>
              <p className="text-caption text-text-muted">Order status</p>
              <p className="text-2xl font-bold tabular-nums text-text">
                {data.orders.total}
              </p>
            </div>
          </div>
          <AdminOrderStatusPanel
            fulfillmentRate={data.orders.fulfillmentRate}
            statuses={data.orders.statuses}
            footerHref="/admin/orders"
            footerLabel="All orders →"
          />
        </AdminDashboardCard>

        <AdminDashboardCard className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-label font-semibold text-text">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="text-caption font-medium text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          {data.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-caption">
                <thead>
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Placed</th>
                    <th className="pb-2 font-medium">Payment</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/60">
                      <td className="py-2.5 font-medium text-text">
                        <Link
                          href={`/admin/orders/${encodeURIComponent(order.number)}`}
                          className="hover:underline"
                        >
                          {order.number}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate py-2.5 text-text-muted">
                        {order.customer}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-text-muted">
                        {order.placedAt}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                            PAYMENT_BADGE[order.paymentStatus],
                          )}
                        >
                          {order.paymentStatus}
                        </span>
                        <span
                          className={cn(
                            "ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                            FULFILLMENT_BADGE[order.fulfillmentStatus],
                          )}
                        >
                          {order.fulfillmentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-text">
                        {formatMoney(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-caption text-text-muted">No orders placed yet.</p>
          )}
        </AdminDashboardCard>
      </div>

      {/* Row 4 — top categories & brands by real revenue */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminDashboardCard>
          <div className="mb-4 flex items-center gap-3">
            <AdminStatIcon tone="yellow">
              <LayoutGrid className="size-6" aria-hidden />
            </AdminStatIcon>
            <div>
              <p className="text-caption text-text-muted">Top categories by revenue</p>
              <p className="text-2xl font-bold tabular-nums text-text">
                {data.categories.total}
                <span className="ml-1 text-caption font-normal text-text-muted">active</span>
              </p>
            </div>
          </div>
          <RankedRevenueList items={data.categories.top} />
        </AdminDashboardCard>

        <AdminDashboardCard>
          <div className="mb-4 flex items-center gap-3">
            <AdminStatIcon tone="pink">
              <Tag className="size-6" aria-hidden />
            </AdminStatIcon>
            <div>
              <p className="text-caption text-text-muted">Top brands by revenue</p>
              <p className="text-2xl font-bold tabular-nums text-text">
                {data.brands.total}
                <span className="ml-1 text-caption font-normal text-text-muted">active</span>
              </p>
            </div>
          </div>
          <RankedRevenueList items={data.brands.top} />
        </AdminDashboardCard>
      </div>

      {/* Row 5 — top products */}
      <AdminDashboardCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-label font-semibold text-text">Top products by revenue</h2>
          <Link
            href="/admin/reports"
            className="text-caption font-medium text-blue-600 hover:underline"
          >
            Full report →
          </Link>
        </div>
        {data.topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-caption">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 text-right font-medium">Qty sold</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((product, index) => (
                  <tr key={product.id} className="border-b border-border/60">
                    <td className="py-2.5 font-medium text-text">
                      <span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-text-muted">
                        {index + 1}
                      </span>
                      {product.name}
                    </td>
                    <td className="py-2.5 text-text-muted">{product.category}</td>
                    <td className="py-2.5 text-right tabular-nums">
                      {product.quantity}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-text">
                      {formatMoney(product.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-caption text-text-muted">No paid orders yet.</p>
        )}
      </AdminDashboardCard>
    </div>
  );
}
