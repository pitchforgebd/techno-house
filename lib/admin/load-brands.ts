import {
  brandRepository,
  categoryRepository,
  productRepository,
} from "@/lib/data";
import {
  buildAdminBrandRows,
  type AdminBrandRow,
} from "@/lib/admin/brands-admin-mock";
import {
  ADMIN_BRAND_PAGE_SIZE,
  type AdminBrandListParams,
} from "@/lib/admin/brand-list-params";
import {
  listAdminBrandRecords,
  usesCatalogDatabase,
  type AdminBrandRecord,
} from "@/lib/catalog/admin-brands";

export type AdminBrandListResult = {
  items: AdminBrandRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  params: AdminBrandListParams;
};

const PLACEHOLDER_LOGO = "/products/placeholder.svg";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatCreatedLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

function recordToRow(record: AdminBrandRecord): AdminBrandRow {
  return {
    slug: record.slug,
    name: record.name,
    logoSrc: record.logoSrc ?? PLACEHOLDER_LOGO,
    productCount: record.productCount,
    createdLabel: formatCreatedLabel(record.createdAt),
    categories: record.categories,
    metaTitle: `${record.name} | Techno House`,
    metaDescription: record.description ?? "",
    position: record.position,
    isActive: record.isActive,
  };
}

async function loadBrandRows(): Promise<AdminBrandRow[]> {
  if (usesCatalogDatabase()) {
    const records = await listAdminBrandRecords();
    return records.map(recordToRow);
  }
  const [brands, categories, catalog] = await Promise.all([
    brandRepository.list(),
    categoryRepository.list(),
    productRepository.list({ page: 1, pageSize: 500, sort: "featured" }),
  ]);
  return buildAdminBrandRows(brands, catalog.items, categories);
}

function paginateRows(
  rows: AdminBrandRow[],
  params: AdminBrandListParams,
): AdminBrandListResult {
  let filtered = rows;
  if (params.tab === "unused") {
    filtered = filtered.filter((row) => row.productCount === 0);
  }

  if (params.q) {
    const needle = params.q.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.slug.toLowerCase().includes(needle) ||
        row.categories.some((category) =>
          category.name.toLowerCase().includes(needle),
        ),
    );
  }

  filtered = [...filtered].sort((a, b) => {
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.name.localeCompare(b.name);
  });

  const total = filtered.length;
  const pageSize = ADMIN_BRAND_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pageCount,
    params: { ...params, page },
  };
}

export async function loadAdminBrandList(
  params: AdminBrandListParams,
): Promise<AdminBrandListResult> {
  const rows = await loadBrandRows();
  return paginateRows(rows, params);
}

export async function getAdminBrandBySlug(
  slug: string,
): Promise<AdminBrandRow | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  const rows = await loadBrandRows();
  return rows.find((row) => row.slug === trimmed) ?? null;
}
