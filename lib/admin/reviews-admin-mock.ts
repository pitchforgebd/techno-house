export type AdminProductReviewSummary = {
  productId: string;
  productSlug: string;
  productName: string;
  imageSrc: string;
  categorySlug: string;
  brandName: string;
  avgRating: number;
  reviewCount: number;
  customReviewCount: number;
  hasNew: boolean;
};

export type AdminCustomReview = {
  id: string;
  productSlug: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isCustom: true;
};

/** Admin-authored custom reviews (display/mock). */
export const MOCK_CUSTOM_REVIEWS: AdminCustomReview[] = [
  {
    id: "custom-1",
    productSlug: "lumen-14-office-laptop",
    reviewerName: "Techno House Staff",
    rating: 5,
    comment:
      "Verified in-store: lightweight for commuting and handles office apps smoothly.",
    createdAt: "2026-08-15",
    isCustom: true,
  },
  {
    id: "custom-2",
    productSlug: "ridge-16-gaming-laptop",
    reviewerName: "Demo Buyer",
    rating: 5,
    comment:
      "Staff pick for mid-range gaming. Cooling is solid with the laptop elevated.",
    createdAt: "2026-08-20",
    isCustom: true,
  },
];
