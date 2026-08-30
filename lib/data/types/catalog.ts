import type {
  Money,
  ProductImage,
  SpecChip,
  SpecGroup,
  StockStatus,
} from "@/lib/data/types/common";

export type BuilderSlot =
  | "cpu"
  | "cpu_cooler"
  | "motherboard"
  | "ram"
  | "gpu"
  | "ssd"
  | "hdd"
  | "psu"
  | "case"
  | "case_fans"
  | "monitor";

export type BuilderAttrs = {
  socket?: string;
  ramType?: string;
  formFactor?: string;
  tdpWatts?: number;
};

export type Category = {
  slug: string;
  name: string;
  parentSlug: string | null;
  filterKeys: string[];
};

export type Brand = {
  slug: string;
  name: string;
  /** Storefront logo path under `/public`. */
  logoSrc: string;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  categorySlug: string;
  sku: string;
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
  warrantyLabel: string;
  image: ProductImage;
  specs: SpecChip[];
  isNew: boolean;
  isSale: boolean;
};

export type ProductDetail = ProductSummary & {
  overview: string[];
  specGroups: SpecGroup[];
  images: ProductImage[];
  relatedSlugs: string[];
  attributes: Record<string, string>;
  builderSlot: BuilderSlot | null;
  builderAttrs: BuilderAttrs | null;
};

export type ProductSort =
  "featured" | "newest" | "price_asc" | "price_desc" | "discount";

export type ProductListQuery = {
  categorySlug?: string;
  /** Fixed brand scope (brand page). */
  brandSlug?: string;
  /** Multi-select brand filter on shop/category/search. */
  brandSlugs?: string[];
  q?: string;
  sort?: ProductSort;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  /** Inclusive integer ৳ amount bounds (display-only). */
  minPrice?: number;
  maxPrice?: number;
  filters?: Record<string, string[]>;
  page: number;
  pageSize: number;
};

export type FacetValue = {
  value: string;
  count: number;
};

export type Facet = {
  key: string;
  values: FacetValue[];
};

export type ProductListResult = {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: Facet[];
};
