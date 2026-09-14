import {
  categoryRepository,
  productRepository,
  reviewRepository,
  type Category,
  type ProductSummary,
} from "@/lib/data";
import { mockProductRating } from "@/lib/admin/product-list-mock";
import {
  MOCK_CUSTOM_REVIEWS,
  type AdminProductReviewSummary,
} from "@/lib/admin/reviews-admin-mock";
import {
  ADMIN_REVIEW_PAGE_SIZE,
  type AdminReviewListParams,
} from "@/lib/admin/review-list-params";
import { listAdminCategoryRecords } from "@/lib/catalog/admin-categories";
import { listAdminProductRecords } from "@/lib/catalog/admin-products";
import {
  listAdminReviewsForProduct,
  listAdminReviewSummaries,
  usesCatalogDatabase,
  type AdminReviewRecord,
} from "@/lib/catalog/admin-reviews";

export type AdminReviewListResult = {
  items: AdminProductReviewSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  categories: Category[];
  params: AdminReviewListParams;
};

function toCategory(record: {
  slug: string;
  name: string;
  parentSlug: string | null;
  filterKeys: string[];
}): Category {
  return {
    slug: record.slug,
    name: record.name,
    parentSlug: record.parentSlug,
    filterKeys: record.filterKeys,
  };
}

async function buildSummaries(
  products: ProductSummary[],
): Promise<AdminProductReviewSummary[]> {
  const summaries: AdminProductReviewSummary[] = [];

  for (const product of products) {
    const reviews = await reviewRepository.listReviewsByProductSlug(
      product.slug,
    );
    const customCount = MOCK_CUSTOM_REVIEWS.filter(
      (item) => item.productSlug === product.slug,
    ).length;
    const realCount = reviews.length;
    let avgRating = 0;
    let reviewCount = 0;

    if (realCount > 0) {
      reviewCount = realCount;
      avgRating =
        Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) /
            realCount) *
            10,
        ) / 10;
    } else {
      const mock = mockProductRating(product.id);
      avgRating = mock.score;
      reviewCount = 1 + (mock.reviews % 4);
    }

    summaries.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      imageSrc: product.image.src,
      categorySlug: product.categorySlug,
      brandName: product.brandName,
      avgRating,
      reviewCount,
      customReviewCount: customCount,
      hasNew: realCount > 0,
    });
  }

  return summaries;
}

function filterSummaries(
  items: AdminProductReviewSummary[],
  params: AdminReviewListParams,
  categories: Category[],
): AdminProductReviewSummary[] {
  let next = items;

  if (params.tab === "custom") {
    next = next.filter((item) => item.customReviewCount > 0);
  }

  if (params.categorySlug) {
    next = next.filter((item) => {
      if (item.categorySlug === params.categorySlug) {
        return true;
      }
      const category = categories.find((c) => c.slug === item.categorySlug);
      return category?.parentSlug === params.categorySlug;
    });
  }

  if (params.q) {
    const needle = params.q.toLowerCase();
    next = next.filter(
      (item) =>
        item.productName.toLowerCase().includes(needle) ||
        item.brandName.toLowerCase().includes(needle) ||
        item.productSlug.toLowerCase().includes(needle),
    );
  }

  return [...next].sort((a, b) => {
    if (params.sort === "rating_asc") {
      return a.avgRating - b.avgRating;
    }
    if (params.sort === "reviews_desc") {
      return b.reviewCount - a.reviewCount;
    }
    return b.avgRating - a.avgRating;
  });
}

export async function loadAdminReviewList(
  params: AdminReviewListParams,
): Promise<AdminReviewListResult> {
  let items: AdminProductReviewSummary[];
  let categories: Category[];

  if (usesCatalogDatabase()) {
    const [summaries, categoryRecords] = await Promise.all([
      listAdminReviewSummaries(),
      listAdminCategoryRecords(),
    ]);
    categories = categoryRecords.map(toCategory);
    items = summaries.map((item) => ({
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      imageSrc: item.imageSrc,
      categorySlug: item.categorySlug,
      brandName: item.brandName,
      avgRating: item.avgRating,
      reviewCount: item.reviewCount,
      customReviewCount: item.customReviewCount,
      hasNew: item.pendingCount > 0,
    }));
  } else {
    const [categoryRows, catalog] = await Promise.all([
      categoryRepository.list(),
      productRepository.list({ page: 1, pageSize: 500, sort: "featured" }),
    ]);
    categories = categoryRows;
    items = await buildSummaries(catalog.items);
  }

  items = filterSummaries(items, params, categories);

  const total = items.length;
  const pageSize = ADMIN_REVIEW_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pageCount,
    categories,
    params: { ...params, page },
  };
}

export async function loadAdminReviewFormOptions(): Promise<{
  categories: Category[];
  products: ProductSummary[];
}> {
  if (usesCatalogDatabase()) {
    const [categoryRecords, catalog] = await Promise.all([
      listAdminCategoryRecords(),
      listAdminProductRecords({
        page: 1,
        pageSize: 500,
        sort: "newest",
        tab: "all",
      }),
    ]);
    return {
      categories: categoryRecords.map(toCategory),
      products: catalog.items,
    };
  }

  const [categories, catalog] = await Promise.all([
    categoryRepository.list(),
    productRepository.list({ page: 1, pageSize: 500, sort: "newest" }),
  ]);
  return { categories, products: catalog.items };
}

export async function loadAdminProductReviews(slug: string): Promise<{
  productName: string;
  productSlug: string;
  items: AdminReviewRecord[];
} | null> {
  if (usesCatalogDatabase()) {
    return listAdminReviewsForProduct(slug);
  }

  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: "featured",
  });
  const product = catalog.items.find((item) => item.slug === slug);
  if (!product) {
    return null;
  }

  const published = await reviewRepository.listReviewsByProductSlug(slug);
  const custom = MOCK_CUSTOM_REVIEWS.filter(
    (item) => item.productSlug === slug,
  );
  const items: AdminReviewRecord[] = [
    ...custom.map((item) => ({
      id: item.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      authorName: item.reviewerName,
      rating: item.rating,
      title: "",
      body: item.comment,
      status: "published" as const,
      isStaffEntry: true,
      createdAt: item.createdAt,
    })),
    ...published.map((item) => ({
      id: item.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      authorName: item.authorName,
      rating: item.rating,
      title: item.title,
      body: item.body,
      status: "published" as const,
      isStaffEntry: false,
      createdAt: item.createdAt,
    })),
  ];

  return {
    productName: product.name,
    productSlug: product.slug,
    items,
  };
}
