/**
 * Data-access composition root.
 *
 * Import from `@/lib/data` in UI / Server Components.
 * Do not import `lib/data/mocks/*` or `lib/data/prisma/*` from presentation
 * code — the repository interfaces are the contract, not the implementation.
 *
 * Repositories always read PostgreSQL. In-memory mocks remain under
 * `lib/data/mocks` for parity tests only (`npm run db:parity`), not runtime.
 */

export type {
  Brand,
  BuilderAttrs,
  BuilderCandidate,
  BuilderSlot,
  Category,
  CurrencyCode,
  Facet,
  FacetValue,
  Money,
  Paged,
  ProductColorOption,
  ProductDetail,
  ProductImage,
  ProductListQuery,
  ProductListResult,
  ProductQuestion,
  ProductReview,
  ProductSearchSuggestion,
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

import { prismaBrandRepository } from "@/lib/data/prisma/brand-repository";
import { prismaCategoryRepository } from "@/lib/data/prisma/category-repository";
import { prismaProductRepository } from "@/lib/data/prisma/product-repository";
import { prismaReviewRepository } from "@/lib/data/prisma/review-repository";
import { assertDatabaseRequired } from "@/lib/runtime/data-source";

assertDatabaseRequired("Catalogue");

export const productRepository = prismaProductRepository;
export const categoryRepository = prismaCategoryRepository;
export const brandRepository = prismaBrandRepository;
export const reviewRepository = prismaReviewRepository;
