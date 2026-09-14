import type { Money } from "@/lib/data/types/common";
import { CURRENCY_CODE } from "@/lib/format/currency";

function money(amount: number): Money {
  return { amount, currency: CURRENCY_CODE };
}

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "ended";

export type AdminPromotion = {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  channel: "homepage" | "category" | "sitewide";
  startsAt: string;
  endsAt: string;
  startsAtSort: string;
  summary: string;
  priority: number;
  bannerSrc: string | null;
  bannerLabel: string | null;
  bannerHref: string | null;
};

export type AdminFlashSale = {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  startsAtSort: string;
  productCount: number;
  maxDiscountPercent: number;
};

export type AdminDeal = {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  scope: "category" | "brand" | "product";
  scopeLabel: string;
  discountLabel: string;
  startsAt: string;
  endsAt: string;
  startsAtSort: string;
};

export type CouponAdminStatus = "active" | "scheduled" | "expired" | "disabled";

export type AdminCoupon = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  label: string;
  status: CouponAdminStatus;
  usageCount: number;
  usageLimit: number | null;
  /** `null` = no per-customer cap (DSA-14). */
  perUserLimit: number | null;
  minSpend: Money | null;
  startsAt: string;
  endsAt: string;
  startsAtSort: string;
};

export const MOCK_ADMIN_PROMOTIONS: readonly AdminPromotion[] = [
  {
    id: "promo-back-to-school",
    name: "Back to school laptops",
    slug: "back-to-school-laptops",
    status: "active",
    channel: "homepage",
    startsAt: "2026-08-01",
    endsAt: "2026-09-15",
    startsAtSort: "2026-08-01",
    summary: "Hero ribbon + featured laptop row on homepage.",
    priority: 10,
    bannerSrc: null,
    bannerLabel: null,
    bannerHref: null,
  },
  {
    id: "promo-component-week",
    name: "Component week",
    slug: "component-week",
    status: "scheduled",
    channel: "category",
    startsAt: "2026-09-05",
    endsAt: "2026-09-12",
    startsAtSort: "2026-09-05",
    summary: "CPU/motherboard category banners.",
    priority: 8,
    bannerSrc: null,
    bannerLabel: null,
    bannerHref: null,
  },
  {
    id: "promo-free-shipping",
    name: "Free shipping over ৳25k",
    slug: "free-shipping-25k",
    status: "active",
    channel: "sitewide",
    startsAt: "2026-07-01",
    endsAt: "2026-12-31",
    startsAtSort: "2026-07-01",
    summary: "Trust bar + cart messaging (display only).",
    priority: 5,
    bannerSrc: null,
    bannerLabel: null,
    bannerHref: null,
  },
  {
    id: "promo-monitor-fest",
    name: "Monitor fest",
    slug: "monitor-fest",
    status: "draft",
    channel: "category",
    startsAt: "2026-10-01",
    endsAt: "2026-10-14",
    startsAtSort: "2026-10-01",
    summary: "Draft — awaiting creative assets.",
    priority: 3,
    bannerSrc: null,
    bannerLabel: null,
    bannerHref: null,
  },
];

export const MOCK_ADMIN_FLASH_SALES: readonly AdminFlashSale[] = [
  {
    id: "flash-weekend-ssd",
    name: "Weekend SSD flash",
    slug: "weekend-ssd-flash",
    status: "active",
    startsAt: "2026-08-30 · 18:00",
    endsAt: "2026-08-31 · 23:59",
    startsAtSort: "2026-08-30T18:00:00",
    productCount: 6,
    maxDiscountPercent: 18,
  },
  {
    id: "flash-midnight-gpu",
    name: "Midnight GPU drop",
    slug: "midnight-gpu-drop",
    status: "scheduled",
    startsAt: "2026-09-02 · 00:00",
    endsAt: "2026-09-02 · 06:00",
    startsAtSort: "2026-09-02T00:00:00",
    productCount: 3,
    maxDiscountPercent: 12,
  },
  {
    id: "flash-accessories",
    name: "Accessory hour",
    slug: "accessory-hour",
    status: "ended",
    startsAt: "2026-08-28 · 20:00",
    endsAt: "2026-08-28 · 21:00",
    startsAtSort: "2026-08-28T20:00:00",
    productCount: 12,
    maxDiscountPercent: 25,
  },
];

export const MOCK_ADMIN_DEALS: readonly AdminDeal[] = [
  {
    id: "deal-laptop-bundle",
    name: "Laptop + bag bundle",
    slug: "laptop-bag-bundle",
    status: "active",
    scope: "product",
    scopeLabel: "Selected laptops",
    discountLabel: "Bundle −৳1,500",
    startsAt: "2026-08-01",
    endsAt: "2026-09-30",
    startsAtSort: "2026-08-01",
  },
  {
    id: "deal-ram-upgrade",
    name: "RAM upgrade week",
    slug: "ram-upgrade-week",
    status: "active",
    scope: "category",
    scopeLabel: "RAM",
    discountLabel: "Up to 15% off",
    startsAt: "2026-08-15",
    endsAt: "2026-09-15",
    startsAtSort: "2026-08-15",
  },
  {
    id: "deal-volt-brand",
    name: "Volt brand spotlight",
    slug: "volt-brand-spotlight",
    status: "scheduled",
    scope: "brand",
    scopeLabel: "Volt",
    discountLabel: "5% extra off",
    startsAt: "2026-09-10",
    endsAt: "2026-09-24",
    startsAtSort: "2026-09-10",
  },
];

export const MOCK_ADMIN_COUPONS: readonly AdminCoupon[] = [
  {
    id: "cpn-save10",
    code: "SAVE10",
    kind: "percent",
    value: 10,
    label: "10% off eligible cart",
    status: "active",
    usageCount: 142,
    usageLimit: null,
    perUserLimit: null,
    minSpend: money(5000),
    startsAt: "2026-01-01",
    endsAt: "2026-12-31",
    startsAtSort: "2026-01-01",
  },
  {
    id: "cpn-welcome500",
    code: "WELCOME500",
    kind: "fixed",
    value: 500,
    label: "৳500 off first order",
    status: "active",
    usageCount: 89,
    usageLimit: 500,
    perUserLimit: null,
    minSpend: money(3000),
    startsAt: "2026-01-01",
    endsAt: "2026-12-31",
    startsAtSort: "2026-01-01",
  },
  {
    id: "cpn-flash24",
    code: "FLASH24",
    kind: "percent",
    value: 24,
    label: "Flash sale exclusive",
    status: "scheduled",
    usageCount: 0,
    usageLimit: 200,
    perUserLimit: null,
    minSpend: null,
    startsAt: "2026-09-02",
    endsAt: "2026-09-03",
    startsAtSort: "2026-09-02",
  },
  {
    id: "cpn-oldpromo",
    code: "OLDSUMMER",
    kind: "percent",
    value: 8,
    label: "Summer promo (expired)",
    status: "expired",
    usageCount: 310,
    usageLimit: null,
    perUserLimit: null,
    minSpend: money(2000),
    startsAt: "2026-06-01",
    endsAt: "2026-08-01",
    startsAtSort: "2026-06-01",
  },
];
