import {
  brandRepository,
  categoryRepository,
  productRepository,
} from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";
import {
  type AdminFlashDeal,
  type CategoryDiscountRow,
  type FlashDealTab,
  type PromoCatalogProduct,
} from "@/lib/admin/promotions-offers-mock";
import { getCategoryDiscountsBySlug } from "@/lib/marketing/category-discounts";
import { countTodaysDealProducts } from "@/lib/marketing/deals";
import {
  countPromotionalProducts,
  listPromotionalProductIds,
} from "@/lib/marketing/promotional-products";
import { listPromotionProductIds } from "@/lib/marketing/promotion-products";
import {
  countActiveFlashSales,
  countFlashSales,
  getAdminFlashDeal,
  listAdminFlashDeals,
  type FlashDealListResult,
} from "@/lib/marketing/flash-sales";
import {
  countActivePromotions,
  countPromotions,
} from "@/lib/marketing/promotions";

export type { FlashDealListResult };

export type PromotionOffersHubSnapshot = {
  campaignTotal: number;
  campaignActive: number;
  totalProducts: number;
  promotionalAssigned: number;
  allCategories: number;
  mainCategories: number;
  flashTotal: number;
  flashActive: number;
  todaysDealFeatured: number;
};

function ratingForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % 50;
  }
  return Math.round((3.5 + (hash % 15) / 10) * 10) / 10;
}

export async function loadPromotionOffersHub(): Promise<PromotionOffersHubSnapshot> {
  const [
    products,
    categories,
    campaignTotal,
    campaignActive,
    flashTotal,
    flashActive,
    todaysDealFeatured,
    promotionalAssigned,
  ] = await Promise.all([
    productRepository.list({ page: 1, pageSize: 500, sort: "featured" }),
    categoryRepository.list(),
    countPromotions(),
    countActivePromotions(),
    countFlashSales(),
    countActiveFlashSales(),
    countTodaysDealProducts(),
    countPromotionalProducts(),
  ]);
  const mainCategories = categories.filter((c) => c.parentSlug === null).length;
  return {
    campaignTotal,
    campaignActive,
    totalProducts: products.total,
    promotionalAssigned,
    allCategories: categories.length,
    mainCategories,
    flashTotal,
    flashActive,
    todaysDealFeatured,
  };
}

export async function loadPromoCatalogProducts(): Promise<
  PromoCatalogProduct[]
> {
  const [catalog, categories, brands] = await Promise.all([
    productRepository.list({ page: 1, pageSize: 500, sort: "featured" }),
    categoryRepository.list(),
    brandRepository.list(),
  ]);
  const categoryName = new Map(categories.map((c) => [c.slug, c.name]));
  const brandName = new Map(brands.map((b) => [b.slug, b.name]));

  return catalog.items.map((product) => ({
    id: product.id,
    name: product.name,
    brandName: brandName.get(product.brandSlug) ?? product.brandName,
    categorySlug: product.categorySlug,
    categoryName:
      categoryName.get(product.categorySlug) ?? product.categorySlug,
    rating: ratingForId(product.id),
    priceLabel: formatMoney(product.price),
    compareAtLabel: product.compareAtPrice
      ? formatMoney(product.compareAtPrice)
      : null,
    imageSrc: product.image.src,
    imageAlt: product.image.alt,
    isSale: product.isSale,
    inStock: product.stockStatus !== "out_of_stock",
  }));
}

export async function loadPromotionalAssignedProducts(): Promise<
  PromoCatalogProduct[]
> {
  const [all, assignedIds] = await Promise.all([
    loadPromoCatalogProducts(),
    listPromotionalProductIds(),
  ]);
  const assigned = new Set(assignedIds);
  return all.filter((p) => assigned.has(p.id));
}

export async function loadTodaysDealProducts(): Promise<PromoCatalogProduct[]> {
  const all = await loadPromoCatalogProducts();
  return all.filter((product) => product.isSale);
}

/** Products assigned to one campaign, for its `/admin/promotions/[id]` product list. */
export async function loadPromotionAssignedProducts(
  promotionId: string,
): Promise<PromoCatalogProduct[]> {
  const [all, assignedIds] = await Promise.all([
    loadPromoCatalogProducts(),
    listPromotionProductIds(promotionId),
  ]);
  const assigned = new Set(assignedIds);
  return all.filter((p) => assigned.has(p.id));
}

export async function loadCategoryDiscountRows(): Promise<
  CategoryDiscountRow[]
> {
  const [categories, catalog, discounts] = await Promise.all([
    categoryRepository.list(),
    productRepository.list({ page: 1, pageSize: 500, sort: "featured" }),
    getCategoryDiscountsBySlug(),
  ]);
  const nameBySlug = new Map(categories.map((c) => [c.slug, c.name]));
  const counts = new Map<string, number>();
  for (const product of catalog.items) {
    counts.set(
      product.categorySlug,
      (counts.get(product.categorySlug) ?? 0) + 1,
    );
  }

  return categories.map((category) => {
    const discount = discounts.get(category.slug);
    const startsAt = discount?.startsAt ?? null;
    return {
      slug: category.slug,
      name: category.name,
      parentName: category.parentSlug
        ? (nameBySlug.get(category.parentSlug) ?? category.parentSlug)
        : null,
      productCount: counts.get(category.slug) ?? 0,
      isMain: category.parentSlug === null,
      iconSrc: null,
      discountPercent: discount?.discountPercent ?? 0,
      // The table's date input is `type="date"`, so it needs YYYY-MM-DD.
      dateRangeLabel: startsAt
        ? startsAt.toISOString().slice(0, 10)
        : "Select Date",
    };
  });
}

export async function loadFlashDealList(params: {
  q: string;
  tab: FlashDealTab;
}): Promise<FlashDealListResult> {
  return listAdminFlashDeals(params);
}

export async function getFlashDealById(
  id: string,
): Promise<AdminFlashDeal | null> {
  return getAdminFlashDeal(id);
}

export function parseFlashDealTab(raw: string): FlashDealTab {
  if (raw === "active" || raw === "inactive") {
    return raw;
  }
  return "all";
}
