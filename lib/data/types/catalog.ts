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
  | "monitor"
  | "keyboard"
  | "mouse"
  | "ups"
  | "speaker"
  | "headphone"
  | "network_adapter"
  | "antivirus";

export type BuilderAttrs = {
  socket?: string;
  ramType?: string;
  formFactor?: string;
  tdpWatts?: number;
  /** Drive / motherboard interface (NVMe, SATA). Optional — missing → unknown. */
  storageInterface?: string;
};

export type Category = {
  slug: string;
  name: string;
  parentSlug: string | null;
  filterKeys: string[];
  /** Brand slugs to show for this category even without matching products
   * yet — see Category.extraBrandSlugs in the schema. */
  extraBrandSlugs: string[];
};

export type Brand = {
  slug: string;
  name: string;
  /** Storefront logo path under `/public`. */
  logoSrc: string;
  description: string | null;
};

export type ProductLabelBadge = {
  id: string;
  text: string;
  backgroundColor: string;
  textTone: "light" | "dark";
};

export type ProductNoteItem = {
  id: string;
  type: string;
  description: string;
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
  /** Short mark for the circular warranty logo (e.g. 1Y). */
  warrantyBadge: string | null;
  /** Uploaded warranty logo image, shown instead of `warrantyBadge` when set. */
  warrantyLogoSrc: string | null;
  image: ProductImage;
  specs: SpecChip[];
  /** Manual admin flag. */
  isNew: boolean;
  /**
   * Derived from `createdAt` (see `lib/catalog/new-arrival.ts`), not set by
   * hand — this is what a new-arrivals listing should badge.
   */
  isNewArrival: boolean;
  isSale: boolean;
  /** Inclusive offer start (ISO date) when a timed discount is set. */
  discountStartsAt: string | null;
  /** Inclusive offer end (ISO date) when a timed discount is set. */
  discountEndsAt: string | null;
  /** Custom labels attached in admin (Flash Sale, Free Shipping, …). */
  labels: ProductLabelBadge[];
  /** In a currently-running Promotion campaign — drives the corner "Offer" ribbon. */
  hasActiveOffer: boolean;
};

/** Minimal row for the header search-as-you-type dropdown — deliberately
 * lighter than ProductSummary (no brand/specs/labels/preset lookup), since
 * this runs on every keystroke. */
export type ProductSearchSuggestion = {
  slug: string;
  name: string;
  image: ProductImage;
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
};

export type ProductColorOption = {
  id: string;
  name: string;
  hex: string | null;
  /** Colour-specific gallery; empty → use product-level images. */
  images: ProductImage[];
};

export type ProductDetail = ProductSummary & {
  /** Legacy plain-text bullets — <meta description> fallback only now. */
  overview: string[];
  /** Rich-text "Quick overview" (buy box), sanitized HTML or `null`. */
  overviewHtml: string | null;
  /** Rich-text "Details" tab content, sanitized HTML or `null`. */
  detailsHtml: string | null;
  specGroups: SpecGroup[];
  images: ProductImage[];
  relatedSlugs: string[];
  attributes: Record<string, string>;
  colors: ProductColorOption[];
  builderSlot: BuilderSlot | null;
  builderAttrs: BuilderAttrs | null;
  youtubeUrl: string | null;
  pdfSpecificationSrc: string | null;
  /** Preset notes attached in admin (shipping, warranty, COD, …). */
  notes: ProductNoteItem[];
};

/** One slot candidate — catalogue card plus builder fields. Never a full catalog. */
export type BuilderCandidate = ProductSummary & {
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
  /**
   * Match `q` word by word (every word must appear somewhere in the product's
   * name, SKU, brand or category) instead of as one phrase. Off by default so
   * the shop and search pages behave as before.
   */
  qWords?: boolean;
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

/** One row per active product, for mega-menu brand grouping — covers the
 * whole catalog, not a paginated page, since every category needs a look. */
export type CategoryBrandPair = {
  categorySlug: string;
  brandSlug: string;
  brandName: string;
};
