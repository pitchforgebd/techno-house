"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminDashboardCard,
  AdminDeltaBadge,
  AdminTrendChart,
} from "@/features/admin/dashboard/admin-dashboard-widgets";
import type { DashboardTrendRange } from "@/lib/admin/dashboard-trend";
import { formatMoney } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

/**
 * Revenue trend card, period-filterable. Defaults to Today.
 *
 * URL-driven (`?range=` and `?from=&to=`) like every other admin report
 * filter in this app (Report Center's period tabs are the same pattern) —
 * changing the period is a real navigation, not a client fetch, so the chosen
 * range survives a refresh and is a shareable/bookmarkable link. A soft
 * (App Router) navigation, not a full page reload.
 */

const QUICK_RANGES: { id: DashboardTrendRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last week" },
  { id: "15days", label: "15 days" },
  { id: "month", label: "This month" },
];

const dateInputClass =
  "h-8 rounded-md border border-border bg-surface px-2 text-caption text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function AdminDashboardTrendCard({
  range,
  rangeLabel,
  customRangeInvalid,
  trend,
  totalAmount,
  orderCount,
  growthPercent,
  initialFrom,
  initialTo,
}: {
  range: DashboardTrendRange;
  rangeLabel: string;
  customRangeInvalid: boolean;
  trend: { label: string; value: number }[];
  totalAmount: number;
  orderCount: number;
  growthPercent: number | null;
  initialFrom: string;
  initialTo: string;
}) {
  const router = useRouter();
  const [showCustom, setShowCustom] = useState(Boolean(initialFrom || initialTo));
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const isCustom = Boolean(initialFrom && initialTo);

  return (
    <AdminDashboardCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-label font-semibold text-text">Revenue trend</h2>
          <p className="text-caption text-text-muted">
            {rangeLabel} · paid orders
          </p>
        </div>
        <AdminDeltaBadge
          percent={growthPercent}
          suffix="vs previous period"
          nullLabel="No prior-period data yet"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1 rounded-lg bg-surface-muted p-1" aria-label="Trend period">
          {QUICK_RANGES.map((option) => {
            const active = !isCustom && range === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  setShowCustom(false);
                  setFrom("");
                  setTo("");
                  router.push(`/admin?range=${option.id}`);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-caption font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-muted hover:text-text",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setShowCustom((prev) => !prev)}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-caption font-medium transition-colors",
            isCustom
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-text-muted hover:text-text",
          )}
        >
          Custom date {showCustom ? "▲" : "▼"}
        </button>
      </div>

      {showCustom ? (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!from || !to) return;
            router.push(`/admin?from=${from}&to=${to}`);
          }}
        >
          <label className="flex flex-col gap-1 text-caption">
            <span className="font-medium text-text-muted">From</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className={dateInputClass}
              aria-label="From date"
            />
          </label>
          <label className="flex flex-col gap-1 text-caption">
            <span className="font-medium text-text-muted">To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className={dateInputClass}
              aria-label="To date"
            />
          </label>
          <button
            type="submit"
            disabled={!from || !to}
            className="h-8 rounded-md bg-primary px-3 text-caption font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Show
          </button>
        </form>
      ) : null}

      {customRangeInvalid ? (
        <p className="mt-2 text-caption font-medium text-danger">
          That date range isn&apos;t valid — showing {rangeLabel} instead.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-2xl font-bold tabular-nums text-text">
          {formatMoney({ amount: totalAmount })}
        </p>
        <p className="text-caption text-text-muted">
          {orderCount} paid order{orderCount === 1 ? "" : "s"}
        </p>
      </div>

      <AdminTrendChart data={trend} className="mt-3" />
    </AdminDashboardCard>
  );
}
