/**
 * Data-access composition root.
 *
 * Import from `@/lib/data` in UI / Server Components.
 * Do not import `lib/data/mocks/*` from presentation code.
 *
 * Frontend phases: mock implementations.
 * Phase 10+: swap these bindings for PostgreSQL repositories.
 */

export type {
  Brand,
  BuilderAttrs,
  BuilderSlot,
  Category,
  CurrencyCode,
  Facet,
  FacetValue,
  Money,
  Paged,
  ProductDetail,
  ProductImage,
  ProductListQuery,
  ProductListResult,
  ProductQuestion,
  ProductReview,
  ProductSort,
  ProductSummary,
  SpecChip,
  SpecGroup,
  SpecRow,
  StockStatus,
} from "@/lib/data/types";

export type { BrandRepository } from "@/lib/data/repositories/brand-repository";
export type { CategoryRepository } from "@/lib/data/repositories/category-repository";
export type { ProductRepository } from "@/lib/data/repositories/product-repository";
export type { ReviewRepository } from "@/lib/data/repositories/review-repository";

import { mockBrandRepository } from "@/lib/data/mocks/brand-repository";
import { mockCategoryRepository } from "@/lib/data/mocks/category-repository";
import { mockProductRepository } from "@/lib/data/mocks/product-repository";
import { mockReviewRepository } from "@/lib/data/mocks/review-repository";

export const productRepository = mockProductRepository;
export const categoryRepository = mockCategoryRepository;
export const brandRepository = mockBrandRepository;
export const reviewRepository = mockReviewRepository;
