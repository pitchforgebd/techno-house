import {
  categoryRepository,
  productRepository,
  type Category,
} from "@/lib/data";
import {
  buildAdminCategoryRows,
  categoryIconKey,
  type AdminCategoryRow,
} from "@/lib/admin/categories-admin-mock";
import {
  ADMIN_CATEGORY_PAGE_SIZE,
  type AdminCategoryListParams,
} from "@/lib/admin/category-list-params";
import {
  listAdminCategoryRecords,
  usesCatalogDatabase,
  type AdminCategoryRecord,
} from "@/lib/catalog/admin-categories";

export type AdminCategoryListResult = {
  items: AdminCategoryRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  allCategories: Category[];
  params: AdminCategoryListParams;
};

function categoryDepthFromParents(
  slug: string,
  parentOf: Map<string, string | null>,
): number {
  let depth = 0;
  let current: string | null = parentOf.get(slug) ?? null;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) {
      break;
    }
    seen.add(current);
    depth += 1;
    current = parentOf.get(current) ?? null;
  }
  return depth;
}

function recordsToRows(records: AdminCategoryRecord[]): AdminCategoryRow[] {
  const parentOf = new Map(
    records.map((record) => [record.slug, record.parentSlug]),
  );
  return records.map((record) => ({
    slug: record.slug,
    name: record.name,
    parentSlug: record.parentSlug,
    parentName: record.parentName,
    filterKeys: record.filterKeys,
    level: categoryDepthFromParents(record.slug, parentOf),
    orderLevel: record.position,
    productCount: record.productCount,
    childCount: record.childCount,
    featured: record.isFeatured,
    hot: record.isHot,
    isActive: record.isActive,
    iconKey: categoryIconKey(record.slug),
    iconSrc: record.iconSrc,
    bannerSrc: record.bannerSrc,
    coverSrc: record.coverSrc,
    metaTitle: `${record.name} | Techno House`,
    metaDescription: record.description ?? "",
    bannerHint: record.bannerSrc,
    coverHint: record.coverSrc,
  }));
}

function recordsToCategories(records: AdminCategoryRecord[]): Category[] {
  return records.map((record) => ({
    slug: record.slug,
    name: record.name,
    parentSlug: record.parentSlug,
    filterKeys: record.filterKeys,
  }));
}

async function productCountByCategory(): Promise<Map<string, number>> {
  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: "featured",
  });
  const counts = new Map<string, number>();
  for (const product of catalog.items) {
    counts.set(
      product.categorySlug,
      (counts.get(product.categorySlug) ?? 0) + 1,
    );
  }
  return counts;
}

async function loadCategoryRows(): Promise<{
  rows: AdminCategoryRow[];
  allCategories: Category[];
}> {
  if (usesCatalogDatabase()) {
    const records = await listAdminCategoryRecords();
    return {
      rows: recordsToRows(records),
      allCategories: recordsToCategories(records),
    };
  }
  const categories = await categoryRepository.list();
  const counts = await productCountByCategory();
  return {
    rows: buildAdminCategoryRows(categories, counts),
    allCategories: categories,
  };
}

function paginateRows(
  rows: AdminCategoryRow[],
  params: AdminCategoryListParams,
  allCategories: Category[],
): AdminCategoryListResult {
  let filtered = rows;
  if (params.tab === "root") {
    filtered = filtered.filter((row) => row.parentSlug === null);
  } else if (params.tab === "sub") {
    filtered = filtered.filter((row) => row.parentSlug !== null);
  }

  if (params.q) {
    const needle = params.q.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.slug.toLowerCase().includes(needle) ||
        (row.parentName?.toLowerCase().includes(needle) ?? false),
    );
  }

  filtered = [...filtered].sort((a, b) => {
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    if (a.orderLevel !== b.orderLevel) {
      return a.orderLevel - b.orderLevel;
    }
    return a.name.localeCompare(b.name);
  });

  const total = filtered.length;
  const pageSize = ADMIN_CATEGORY_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pageCount,
    allCategories,
    params: { ...params, page },
  };
}

export async function loadAdminCategoryList(
  params: AdminCategoryListParams,
): Promise<AdminCategoryListResult> {
  const loaded = await loadCategoryRows();
  return paginateRows(loaded.rows, params, loaded.allCategories);
}

export async function getAdminCategoryBySlug(
  slug: string,
): Promise<AdminCategoryRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  const loaded = await loadCategoryRows();
  return loaded.rows.find((row) => row.slug === trimmed) ?? null;
}

export async function loadAdminCategoryFormOptions(): Promise<{
  categories: Category[];
}> {
  const loaded = await loadCategoryRows();
  return { categories: loaded.allCategories };
}
