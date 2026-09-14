import type { Money } from "@/lib/data/types/common";
import { CURRENCY_CODE } from "@/lib/format/currency";

function money(amount: number): Money {
  return { amount, currency: CURRENCY_CODE };
}

export type AnalyticsPeriod = "7d" | "30d" | "90d";

export type AnalyticsKpi = {
  id: string;
  label: string;
  value: string;
  changeLabel: string;
  changeDirection: "up" | "down" | "flat";
};

export type AnalyticsTrendPoint = {
  label: string;
  sessions: number;
  orders: number;
  revenue: Money;
};

export type AnalyticsTopProduct = {
  id: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: Money;
};

export type AnalyticsTrafficSource = {
  source: string;
  sessions: number;
  sharePercent: number;
};

export type AnalyticsDeviceSplit = {
  device: string;
  sessions: number;
  sharePercent: number;
};

export type AnalyticsSnapshot = {
  period: AnalyticsPeriod;
  periodLabel: string;
  generatedAtLabel: string;
  kpis: AnalyticsKpi[];
  trend: AnalyticsTrendPoint[];
  topProducts: AnalyticsTopProduct[];
  trafficSources: AnalyticsTrafficSource[];
  deviceSplit: AnalyticsDeviceSplit[];
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const KPI_BY_PERIOD: Record<AnalyticsPeriod, AnalyticsKpi[]> = {
  "7d": [
    {
      id: "sessions",
      label: "Sessions",
      value: "18,420",
      changeLabel: "+12% vs prior week",
      changeDirection: "up",
    },
    {
      id: "conversion",
      label: "Conversion rate",
      value: "2.4%",
      changeLabel: "+0.3 pts",
      changeDirection: "up",
    },
    {
      id: "aov",
      label: "Avg. order value",
      value: "৳ 14,280",
      changeLabel: "−৳ 420",
      changeDirection: "down",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: "৳ 6,32,400",
      changeLabel: "+8% vs prior week",
      changeDirection: "up",
    },
  ],
  "30d": [
    {
      id: "sessions",
      label: "Sessions",
      value: "74,800",
      changeLabel: "+9% vs prior month",
      changeDirection: "up",
    },
    {
      id: "conversion",
      label: "Conversion rate",
      value: "2.1%",
      changeLabel: "−0.1 pts",
      changeDirection: "down",
    },
    {
      id: "aov",
      label: "Avg. order value",
      value: "৳ 13,950",
      changeLabel: "+৳ 180",
      changeDirection: "up",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: "৳ 21,84,000",
      changeLabel: "+11% vs prior month",
      changeDirection: "up",
    },
  ],
  "90d": [
    {
      id: "sessions",
      label: "Sessions",
      value: "2,18,600",
      changeLabel: "+15% vs prior quarter",
      changeDirection: "up",
    },
    {
      id: "conversion",
      label: "Conversion rate",
      value: "2.0%",
      changeLabel: "Flat",
      changeDirection: "flat",
    },
    {
      id: "aov",
      label: "Avg. order value",
      value: "৳ 13,720",
      changeLabel: "+৳ 95",
      changeDirection: "up",
    },
    {
      id: "revenue",
      label: "Revenue",
      value: "৳ 58,40,000",
      changeLabel: "+14% vs prior quarter",
      changeDirection: "up",
    },
  ],
};

const TREND_7D: AnalyticsTrendPoint[] = [
  { label: "Mon", sessions: 2100, orders: 48, revenue: money(684000) },
  { label: "Tue", sessions: 2450, orders: 52, revenue: money(742000) },
  { label: "Wed", sessions: 2680, orders: 61, revenue: money(871000) },
  { label: "Thu", sessions: 2520, orders: 55, revenue: money(786000) },
  { label: "Fri", sessions: 2890, orders: 64, revenue: money(914000) },
  { label: "Sat", sessions: 3120, orders: 71, revenue: money(1014000) },
  { label: "Sun", sessions: 2660, orders: 58, revenue: money(828000) },
];

const TREND_30D: AnalyticsTrendPoint[] = [
  { label: "Wk 1", sessions: 16800, orders: 352, revenue: money(4910000) },
  { label: "Wk 2", sessions: 18200, orders: 378, revenue: money(5270000) },
  { label: "Wk 3", sessions: 19100, orders: 401, revenue: money(5590000) },
  { label: "Wk 4", sessions: 20700, orders: 432, revenue: money(6070000) },
];

const TREND_90D: AnalyticsTrendPoint[] = [
  { label: "Jun", sessions: 68200, orders: 1360, revenue: money(18680000) },
  { label: "Jul", sessions: 72400, orders: 1448, revenue: money(19880000) },
  { label: "Aug", sessions: 78000, orders: 1560, revenue: money(21440000) },
];

const TOP_PRODUCTS: AnalyticsTopProduct[] = [
  {
    id: "prod-ryzen-7600",
    name: "Ryzen 5 7600",
    sku: "CPU-R5-7600",
    unitsSold: 142,
    revenue: money(2130000),
  },
  {
    id: "prod-rtx-4060",
    name: "RTX 4060 8GB",
    sku: "GPU-RTX4060-8",
    unitsSold: 98,
    revenue: money(4312000),
  },
  {
    id: "prod-ssd-1tb",
    name: "NVMe SSD 1TB",
    sku: "SSD-NV1TB",
    unitsSold: 210,
    revenue: money(1575000),
  },
  {
    id: "prod-laptop-pro",
    name: "ProBook 15",
    sku: "LAP-PB15",
    unitsSold: 54,
    revenue: money(6480000),
  },
  {
    id: "prod-ram-16",
    name: "DDR5 16GB Kit",
    sku: "RAM-DDR5-16",
    unitsSold: 176,
    revenue: money(880000),
  },
];

const TRAFFIC_SOURCES: AnalyticsTrafficSource[] = [
  { source: "Organic search", sessions: 8420, sharePercent: 46 },
  { source: "Direct", sessions: 3680, sharePercent: 20 },
  { source: "Facebook / Meta", sessions: 2940, sharePercent: 16 },
  { source: "Google Ads", sessions: 1840, sharePercent: 10 },
  { source: "Referral", sessions: 1540, sharePercent: 8 },
];

const DEVICE_SPLIT: AnalyticsDeviceSplit[] = [
  { device: "Mobile", sessions: 10240, sharePercent: 56 },
  { device: "Desktop", sessions: 6840, sharePercent: 37 },
  { device: "Tablet", sessions: 1340, sharePercent: 7 },
];

export function getAnalyticsSnapshot(
  period: AnalyticsPeriod,
): AnalyticsSnapshot {
  const trend =
    period === "7d" ? TREND_7D : period === "30d" ? TREND_30D : TREND_90D;

  return {
    period,
    periodLabel: PERIOD_LABELS[period],
    generatedAtLabel: "Mock snapshot · display only",
    kpis: KPI_BY_PERIOD[period],
    trend,
    topProducts: TOP_PRODUCTS,
    trafficSources: TRAFFIC_SOURCES,
    deviceSplit: DEVICE_SPLIT,
  };
}
