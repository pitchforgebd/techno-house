/**
 * Promotion & Offers mock data (UI-only until Phase 15+).
 * Single-vendor — no seller columns.
 */

export type FlashDealTab = "all" | "active" | "inactive";

export type AdminFlashDeal = {
  id: string;
  title: string;
  bannerSrc: string | null;
  startsAt: string;
  endsAt: string;
  startsAtSort: string;
  statusOn: boolean;
  featured: boolean;
};

export type PromoCatalogProduct = {
  id: string;
  name: string;
  brandName: string;
  categorySlug: string;
  categoryName: string;
  rating: number;
  priceLabel: string;
  compareAtLabel: string | null;
  imageSrc: string;
  imageAlt: string;
  isSale: boolean;
  inStock: boolean;
};

export type CategoryDiscountRow = {
  slug: string;
  name: string;
  parentName: string | null;
  productCount: number;
  isMain: boolean;
  iconSrc: string | null;
  discountPercent: number;
  dateRangeLabel: string;
};

export const MOCK_FLASH_DEALS: AdminFlashDeal[] = [
  {
    id: "flash-end-season",
    title: "End of Season",
    bannerSrc: null,
    startsAt: "01-09-2026 00:00:00",
    endsAt: "15-09-2026 23:59:59",
    startsAtSort: "2026-09-01T00:00:00",
    statusOn: true,
    featured: true,
  },
  {
    id: "flash-winter",
    title: "Winter Sale",
    bannerSrc: null,
    startsAt: "10-09-2026 10:00:00",
    endsAt: "20-09-2026 22:00:00",
    startsAtSort: "2026-09-10T10:00:00",
    statusOn: true,
    featured: false,
  },
  {
    id: "flash-electronic",
    title: "Electronic",
    bannerSrc: null,
    startsAt: "05-08-2026 09:00:00",
    endsAt: "12-08-2026 21:00:00",
    startsAtSort: "2026-08-05T09:00:00",
    statusOn: false,
    featured: false,
  },
  {
    id: "flash-sale-hour",
    title: "Flash Sale",
    bannerSrc: null,
    startsAt: "28-08-2026 20:00:00",
    endsAt: "28-08-2026 21:00:00",
    startsAtSort: "2026-08-28T20:00:00",
    statusOn: true,
    featured: true,
  },
];

/** Product IDs currently assigned to promotional channel (mock). */
export const MOCK_PROMOTIONAL_PRODUCT_IDS: string[] = [];

/** Product IDs featured in Today's Deal (mock). */
export const MOCK_TODAYS_DEAL_PRODUCT_IDS: string[] = [];
