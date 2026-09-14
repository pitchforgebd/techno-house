import {
  brandRepository,
  categoryRepository,
  productRepository,
  type Category,
  type ProductSummary,
} from "@/lib/data";
import { isDraftProduct, mockProductRating } from "@/lib/admin/product-list-mock";
import {
  ADMIN_PRODUCT_PAGE_SIZE,
  type AdminProductListParams,
} from "@/lib/admin/product-list-params";
import {
  getAdminProductRecord,
  listAdminProductRecords,
  usesCatalogDatabase,
  type AdminProductEditor,
  type AdminProductListItem,
} from "@/lib/catalog/admin-products";
import {
  listAdminAttributeRecords,
  usesCatalogDatabase as usesAttributeDatabase,
} from "@/lib/catalog/admin-attributes";
import { listAdminBrandRecords } from "@/lib/catalog/admin-brands";
import { listAdminCategoryRecords } from "@/lib/catalog/admin-categories";
import {
  MOCK_ADMIN_ATTRIBUTES,
  type AdminAttribute,
} from "@/lib/admin/attributes-mock";
import { MOCK_ADMIN_UNITS } from "@/lib/admin/units-mock";
import { listProductWarrantyOptions } from "@/lib/catalog/warranty-badge";
import type {
  ProductLabelOption,
  ProductNoteOption,
} from "@/lib/catalog/product-notes-labels";
import {
  listProductLabelOptions,
  listProductNoteOptions,
} from "@/lib/catalog/product-notes-labels-server";

export type AdminProductListResult = {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  categories: Category[];
  params: AdminProductListParams;
};

/**
 * `DATA_SOURCE=mock` fallback (no database at all) — matches `load-reviews.ts`'s
 * use of the same `mockProductRating()` helper for this same no-DB case.
 * `salesCount` has no mock analogue (no orders exist in this mode either).
 */
function asListItem(
  product: ProductSummary,
  extras: {
    isActive: boolean;
    position?: number;
    quantity?: number;
    reserved?: number;
    lowStockThreshold?: number;
  },
): AdminProductListItem {
  const rating = mockProductRating(product.id);
  return {
    ...product,
    isActive: extras.isActive,
    position: extras.position ?? 0,
    quantity: extras.quantity ?? 0,
    reserved: extras.reserved ?? 0,
    lowStockThreshold: extras.lowStockThreshold ?? 5,
    avgRating: rating.score,
    reviewCount: rating.reviews,
    salesCount: 0,
  };
}

export async function loadAdminProductList(
  params: AdminProductListParams,
): Promise<AdminProductListResult> {
  if (usesCatalogDatabase()) {
    const [catalog, categories] = await Promise.all([
      listAdminProductRecords({
        q: params.q || undefined,
        categorySlug: params.categorySlug,
        stock: params.stock,
        sort: params.sort,
        tab: params.tab,
        page: params.page,
        pageSize: ADMIN_PRODUCT_PAGE_SIZE,
      }),
      loadAdminProductFormOptions().then((options) => options.categories),
    ]);
    const pageSize = ADMIN_PRODUCT_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(catalog.total / pageSize));
    const page = Math.min(params.page, pageCount);
    return {
      items: catalog.items,
      total: catalog.total,
      page,
      pageSize,
      pageCount,
      categories,
      params: { ...params, page },
    };
  }

  const categories = await categoryRepository.list();
  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: params.sort,
    q: params.q || undefined,
    categorySlug: params.categorySlug ?? undefined,
    inStockOnly: params.stock === "in_stock",
  });

  let items = catalog.items.map((product) =>
    asListItem(product, {
      isActive: product.stockStatus !== "out_of_stock",
      quantity:
        product.stockStatus === "out_of_stock"
          ? 0
          : product.stockStatus === "low_stock"
            ? 4
            : 25,
      reserved: 0,
      lowStockThreshold: 5,
    }),
  );
  if (params.stock === "low_stock" || params.stock === "out_of_stock") {
    items = items.filter((product) => product.stockStatus === params.stock);
  }

  if (params.tab === "inhouse") {
    items = items.filter((product) => !isDraftProduct(product));
  } else if (params.tab === "drafts") {
    items = items.filter(isDraftProduct);
  }

  const total = items.length;
  const pageSize = ADMIN_PRODUCT_PAGE_SIZE;
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

export async function getAdminProductById(
  id: string,
): Promise<AdminProductEditor | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  if (usesCatalogDatabase()) {
    return getAdminProductRecord(trimmed);
  }

  const catalog = await productRepository.list({
    page: 1,
    pageSize: 500,
    sort: "featured",
  });
  const summary = catalog.items.find((product) => product.id === trimmed);
  if (!summary) {
    return null;
  }
  const detail = await productRepository.getBySlug(summary.slug);
  if (!detail) {
    return null;
  }
  return {
    ...detail,
    isActive: detail.stockStatus !== "out_of_stock",
    position: 0,
    quantity:
      detail.stockStatus === "out_of_stock"
        ? 0
        : detail.stockStatus === "low_stock"
          ? 4
          : 25,
    reserved: 0,
    lowStockThreshold: 5,
    variants: [],
    barcode: "",
    relatedProducts: [],
  };
}

export type ProductFormAttributeOption = Pick<
  AdminAttribute,
  "id" | "key" | "name" | "values"
>;

async function loadProductFormAttributes(): Promise<
  ProductFormAttributeOption[]
> {
  if (usesAttributeDatabase()) {
    const rows = await listAdminAttributeRecords();
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      values: row.values,
    }));
  }
  return MOCK_ADMIN_ATTRIBUTES.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    values: row.values,
  }));
}

export async function loadAdminProductFormOptions(): Promise<{
  categories: Category[];
  brands: { slug: string; name: string }[];
  attributes: ProductFormAttributeOption[];
  units: { id: string; name: string }[];
  warranties: { id: string; text: string; badge: string }[];
  notes: ProductNoteOption[];
  labels: ProductLabelOption[];
}> {
  const units = [...MOCK_ADMIN_UNITS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((unit) => ({ id: unit.id, name: unit.name }));
  const warranties = listProductWarrantyOptions();
  const notes = await listProductNoteOptions();
  const labels = await listProductLabelOptions();

  if (usesCatalogDatabase()) {
    const [categories, brands, attributes] = await Promise.all([
      listAdminCategoryRecords(),
      listAdminBrandRecords(),
      loadProductFormAttributes(),
    ]);
    return {
      categories: categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        parentSlug: category.parentSlug,
        filterKeys: category.filterKeys,
      })),
      brands: brands.map((brand) => ({ slug: brand.slug, name: brand.name })),
      attributes,
      units,
      warranties,
      notes,
      labels,
    };
  }

  const [categories, brands, attributes] = await Promise.all([
    categoryRepository.list(),
    brandRepository.list(),
    loadProductFormAttributes(),
  ]);
  return {
    categories,
    brands: brands.map((brand) => ({ slug: brand.slug, name: brand.name })),
    attributes,
    units,
    warranties,
    notes,
    labels,
  };
}
