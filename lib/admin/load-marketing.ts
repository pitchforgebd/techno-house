import {
  MOCK_ADMIN_DEALS,
  MOCK_ADMIN_FLASH_SALES,
  type AdminCoupon,
  type AdminDeal,
  type AdminFlashSale,
  type AdminPromotion,
} from "@/lib/admin/marketing-mock";
import {
  countActivePromotions,
  countPromotionsByStatus,
  getAdminPromotion,
  listAdminPromotions,
} from "@/lib/marketing/promotions";
import {
  countActiveFlashSales,
  countFlashSales,
} from "@/lib/marketing/flash-sales";
import {
  countActiveCoupons,
  getAdminCoupon,
  listAdminCoupons,
} from "@/lib/marketing/coupons";
import { countTodaysDealProducts } from "@/lib/marketing/deals";
import {
  ADMIN_MARKETING_PAGE_SIZE,
  type CouponListParams,
  type MarketingListParams,
} from "@/lib/admin/marketing-list-params";

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: MarketingListParams;
};

type CouponPaginated = {
  items: AdminCoupon[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: CouponListParams;
};

function paginateCampaigns<T extends { status: string; name: string }>(
  items: readonly T[],
  params: MarketingListParams,
  searchFields: (item: T) => string[],
): Paginated<T> {
  let filtered = [...items];
  if (params.status !== "all") {
    filtered = filtered.filter((item) => item.status === params.status);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((item) =>
      searchFields(item).some((field) => field.toLowerCase().includes(q)),
    );
  }
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const pageSize = ADMIN_MARKETING_PAGE_SIZE;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function loadAdminPromotions(
  params: MarketingListParams,
): Promise<Paginated<AdminPromotion>> {
  return listAdminPromotions(params);
}

export function loadAdminFlashSales(
  params: MarketingListParams,
): Paginated<AdminFlashSale> {
  return paginateCampaigns(MOCK_ADMIN_FLASH_SALES, params, (item) => [
    item.name,
    item.slug,
  ]);
}

export function loadAdminDeals(
  params: MarketingListParams,
): Paginated<AdminDeal> {
  return paginateCampaigns(MOCK_ADMIN_DEALS, params, (item) => [
    item.name,
    item.slug,
    item.scopeLabel,
    item.discountLabel,
  ]);
}

export async function loadAdminCoupons(
  params: CouponListParams,
): Promise<CouponPaginated> {
  return listAdminCoupons(params);
}

export async function getAdminPromotionById(
  id: string,
): Promise<AdminPromotion | null> {
  return getAdminPromotion(id);
}

export function getAdminFlashSaleById(id: string): AdminFlashSale | null {
  return MOCK_ADMIN_FLASH_SALES.find((item) => item.id === id) ?? null;
}

export function getAdminDealById(id: string): AdminDeal | null {
  return MOCK_ADMIN_DEALS.find((item) => item.id === id) ?? null;
}

export async function getAdminCouponById(
  id: string,
): Promise<AdminCoupon | null> {
  return getAdminCoupon(id);
}

export type MarketingHubSnapshot = {
  activePromotions: number;
  activeFlashSales: number;
  activeDeals: number;
  activeCoupons: number;
  scheduledCount: number;
};

export async function loadMarketingHub(): Promise<MarketingHubSnapshot> {
  const activePromotions = await countActivePromotions();
  const [activeFlashSales, flashTotal, activeDeals, activeCoupons] =
    await Promise.all([
      countActiveFlashSales(),
      countFlashSales(),
      countTodaysDealProducts(),
      countActiveCoupons(),
    ]);
  const scheduledPromotions = await countPromotionsByStatus("scheduled");
  const scheduledCount =
    scheduledPromotions +
    Math.max(0, flashTotal - activeFlashSales) +
    MOCK_ADMIN_DEALS.filter((item) => item.status === "scheduled").length;

  return {
    activePromotions,
    activeFlashSales,
    activeDeals,
    activeCoupons,
    scheduledCount,
  };
}
