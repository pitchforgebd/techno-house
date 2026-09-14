"use client";

import { useId } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

const TONES: Record<
  "pink" | "green" | "blue" | "cyan" | "yellow" | "red",
  string
> = {
  pink: "bg-pink-500",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
};

export function AdminOrderStatusPanel({
  fulfillmentRate,
  statuses,
  footerHref,
  footerLabel,
}: {
  fulfillmentRate: number;
  statuses: {
    id: string;
    label: string;
    count: number;
    percent: number;
    tone: keyof typeof TONES;
  }[];
  footerHref?: string;
  footerLabel?: string;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-caption font-medium text-blue-600">
          Fulfilment rate {fulfillmentRate.toFixed(1)}%
        </span>
      </div>
      <ul className="space-y-3">
        {statuses.map((row) => (
          <li key={row.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-caption">
              <span className="flex items-center gap-2 text-text">
                <span
                  className={cn("size-2.5 rounded-full", TONES[row.tone])}
                  aria-hidden
                />
                {row.label}
                <span className="text-text-muted">({row.percent.toFixed(1)}%)</span>
              </span>
              <span className="tabular-nums font-semibold text-text">
                {row.count}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={cn("h-full rounded-full", TONES[row.tone])}
                style={{ width: `${Math.max(row.percent, row.count > 0 ? 4 : 0)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {footerHref && footerLabel ? (
        <Link
          href={footerHref}
          className="mt-4 inline-block text-caption font-medium text-blue-600 hover:underline"
        >
          {footerLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function AdminDashboardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-black/5 bg-white p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatIcon({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "purple" | "green" | "blue" | "yellow" | "pink" | "orange";
}) {
  const tones = {
    purple: "bg-violet-100 text-violet-600",
    green: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    yellow: "bg-amber-100 text-amber-600",
    pink: "bg-pink-100 text-pink-600",
    orange: "bg-orange-100 text-orange-600",
  };
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

/** Small up/down percentage chip, e.g. "+12.4% vs last month". Null renders nothing. */
export function AdminDeltaBadge({
  percent,
  suffix = "vs last month",
}: {
  percent: number | null;
  suffix?: string;
}) {
  if (percent === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted">
        New this month
      </span>
    );
  }
  const positive = percent >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600",
      )}
    >
      {positive ? (
        <TrendingUp className="size-3" aria-hidden />
      ) : (
        <TrendingDown className="size-3" aria-hidden />
      )}
      {positive ? "+" : ""}
      {percent.toFixed(1)}% {suffix}
    </span>
  );
}

/** Real day-by-day revenue trend — lightweight inline SVG, no chart library. */
export function AdminTrendChart({
  data,
  className,
}: {
  data: { label: string; value: number }[];
  className?: string;
}) {
  const gradientId = useId();
  const width = 100;
  const height = 32;

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex h-32 items-center justify-center text-caption text-text-muted",
          className,
        )}
      >
        No paid orders in this period yet.
      </div>
    );
  }

  const max = Math.max(...data.map((point) => point.value), 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((point, index) => ({
    ...point,
    x: data.length > 1 ? index * stepX : width / 2,
    y: height - (point.value / max) * height,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath =
    points.length > 1 && firstPoint && lastPoint
      ? `${linePath} L ${lastPoint.x.toFixed(2)} ${height} L ${firstPoint.x.toFixed(2)} ${height} Z`
      : "";

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-32 w-full overflow-visible text-blue-600"
        role="img"
        aria-label="Revenue trend over the last 14 days"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" /> : null}
        <path
          d={linePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r="1.4"
            vectorEffect="non-scaling-stroke"
            className="fill-blue-600"
          >
            <title>{`${point.label}: ${formatMoney({ amount: point.value })}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-text-muted">
        {data.map((point, index) =>
          index % labelEvery === 0 || index === data.length - 1 ? (
            <span key={point.label}>{point.label}</span>
          ) : (
            <span key={point.label} aria-hidden />
          ),
        )}
      </div>
    </div>
  );
}
