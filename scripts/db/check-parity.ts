/**
 * Mock vs database repository parity (P10-T06).
 *
 *   npm run db:parity
 *
 * Runs both implementations over the same queries and diffs the results. This
 * is what backs the claim that swapping `DATA_SOURCE` cannot change what a
 * page renders: the seed and the mocks share a source, so any drift here is a
 * bug in a repository or in the seed.
 *
 * Known and intentional difference: `relatedSlugs` ordering. The link table
 * carries no position, so the database returns catalogue order rather than the
 * curated per-product order; related slugs are therefore compared as sets.
 */
import { config as loadEnvFiles } from "dotenv";
import { mockBrandRepository } from "@/lib/data/mocks/brand-repository";
import { mockCategoryRepository } from "@/lib/data/mocks/category-repository";
import { mockProductRepository } from "@/lib/data/mocks/product-repository";
import { mockReviewRepository } from "@/lib/data/mocks/review-repository";
import { prismaBrandRepository } from "@/lib/data/prisma/brand-repository";
import { prismaCategoryRepository } from "@/lib/data/prisma/category-repository";
import { prismaProductRepository } from "@/lib/data/prisma/product-repository";
import { prismaReviewRepository } from "@/lib/data/prisma/review-repository";
import type { ProductDetail, ProductListQuery } from "@/lib/data/types/catalog";

let checks = 0;
let failures = 0;

/**
 * Object key order is not part of the repository contract — the mocks are
 * hand-written literals and the mappers build objects in their own order — so
 * keys are sorted before comparison. Array order is preserved, because list
 * ordering is meaningful.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

function compare(label: string, expected: unknown, actual: unknown): void {
  checks += 1;
  const left = JSON.stringify(canonical(expected), null, 2);
  const right = JSON.stringify(canonical(actual), null, 2);
  if (left === right) {
    return;
  }
  failures += 1;
  console.error(`\nMISMATCH  ${label}`);
  console.error(`  mock:     ${truncate(left)}`);
  console.error(`  database: ${truncate(right)}`);
}

function truncate(value: string): string {
  const flat = value.replace(/\s+/g, " ");
  return flat.length > 600 ? `${flat.slice(0, 600)}…` : flat;
}

/** Related slugs are compared as a set; see the note at the top of the file. */
function normalizeDetail(detail: ProductDetail | null): unknown {
  if (!detail) {
    return null;
  }
  return { ...detail, relatedSlugs: [...detail.relatedSlugs].sort() };
}

const LIST_QUERIES: { label: string; query: ProductListQuery }[] = [
  { label: "default", query: { page: 1, pageSize: 8 } },
  { label: "page 2", query: { page: 2, pageSize: 8 } },
  { label: "page 3 small", query: { page: 3, pageSize: 4 } },
  { label: "sort newest", query: { page: 1, pageSize: 8, sort: "newest" } },
  {
    label: "sort price_asc",
    query: { page: 1, pageSize: 8, sort: "price_asc" },
  },
  {
    label: "sort price_desc",
    query: { page: 1, pageSize: 8, sort: "price_desc" },
  },
  { label: "sort discount", query: { page: 1, pageSize: 8, sort: "discount" } },
  {
    label: "category laptops",
    query: { page: 1, pageSize: 12, categorySlug: "laptops" },
  },
  {
    label: "category components (tree)",
    query: { page: 1, pageSize: 24, categorySlug: "components" },
  },
  {
    label: "category pcs-servers (deep tree)",
    query: { page: 1, pageSize: 24, categorySlug: "pcs-servers" },
  },
  {
    label: "brand page lumen",
    query: { page: 1, pageSize: 12, brandSlug: "lumen" },
  },
  {
    label: "brand filter multi",
    query: { page: 1, pageSize: 12, brandSlugs: ["lumen", "volt"] },
  },
  {
    label: "in stock only",
    query: { page: 1, pageSize: 24, inStockOnly: true },
  },
  { label: "on sale only", query: { page: 1, pageSize: 24, onSaleOnly: true } },
  {
    label: "price band",
    query: { page: 1, pageSize: 24, minPrice: 5000, maxPrice: 90000 },
  },
  { label: "search laptop", query: { page: 1, pageSize: 12, q: "laptop" } },
  { label: "search sku", query: { page: 1, pageSize: 12, q: "TH-LT" } },
  { label: "search miss", query: { page: 1, pageSize: 12, q: "zzzz-nothing" } },
  {
    label: "search category slug",
    query: { page: 1, pageSize: 12, q: "cpu-coolers" },
  },
  {
    label: "search category name",
    query: { page: 1, pageSize: 12, q: "Processors" },
  },
  {
    label: "attribute filter ram",
    query: { page: 1, pageSize: 24, filters: { ram: ["16GB"] } },
  },
  {
    label: "attribute filter multi-value",
    query: { page: 1, pageSize: 24, filters: { ram: ["16GB", "8GB"] } },
  },
  {
    label: "two attribute filters",
    query: {
      page: 1,
      pageSize: 24,
      filters: { ram: ["16GB"], storage: ["512GB"] },
    },
  },
  {
    label: "category + filter + sort",
    query: {
      page: 1,
      pageSize: 12,
      categorySlug: "laptops",
      filters: { processor: ["Core 5", "Core 7"] },
      sort: "price_asc",
    },
  },
  {
    label: "everything at once",
    query: {
      page: 1,
      pageSize: 24,
      categorySlug: "components",
      brandSlugs: ["volt", "coreline"],
      inStockOnly: true,
      minPrice: 1000,
      sort: "price_desc",
    },
  },
];

const BUILDER_SLOTS = [
  "cpu",
  "cpu_cooler",
  "motherboard",
  "ram",
  "gpu",
  "ssd",
  "hdd",
  "psu",
  "case",
  "case_fans",
  "monitor",
] as const;

async function main(): Promise<void> {
  loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

  // --- Categories and brands ------------------------------------------------
  const [mockCategories, dbCategories] = await Promise.all([
    mockCategoryRepository.list(),
    prismaCategoryRepository.list(),
  ]);
  compare("categoryRepository.list()", mockCategories, dbCategories);

  for (const category of mockCategories) {
    compare(
      `categoryRepository.getBySlug(${category.slug})`,
      category,
      await prismaCategoryRepository.getBySlug(category.slug),
    );
  }
  compare(
    "categoryRepository.getBySlug(missing)",
    await mockCategoryRepository.getBySlug("no-such-category"),
    await prismaCategoryRepository.getBySlug("no-such-category"),
  );

  const [mockBrands, dbBrands] = await Promise.all([
    mockBrandRepository.list(),
    prismaBrandRepository.list(),
  ]);
  compare("brandRepository.list()", mockBrands, dbBrands);

  for (const brand of mockBrands) {
    compare(
      `brandRepository.getBySlug(${brand.slug})`,
      brand,
      await prismaBrandRepository.getBySlug(brand.slug),
    );
  }

  // --- Product listing ------------------------------------------------------
  for (const { label, query } of LIST_QUERIES) {
    const [expected, actual] = await Promise.all([
      mockProductRepository.list(query),
      prismaProductRepository.list(query),
    ]);
    compare(`productRepository.list(${label})`, expected, actual);
  }

  // --- Product detail, reviews, questions -----------------------------------
  const all = await mockProductRepository.list({ page: 1, pageSize: 48 });
  for (const summary of all.items) {
    const [expected, actual] = await Promise.all([
      mockProductRepository.getBySlug(summary.slug),
      prismaProductRepository.getBySlug(summary.slug),
    ]);
    compare(
      `productRepository.getBySlug(${summary.slug})`,
      normalizeDetail(expected),
      normalizeDetail(actual),
    );

    compare(
      `reviewRepository.listReviewsByProductSlug(${summary.slug})`,
      await mockReviewRepository.listReviewsByProductSlug(summary.slug),
      await prismaReviewRepository.listReviewsByProductSlug(summary.slug),
    );
    compare(
      `reviewRepository.listQuestionsByProductSlug(${summary.slug})`,
      await mockReviewRepository.listQuestionsByProductSlug(summary.slug),
      await prismaReviewRepository.listQuestionsByProductSlug(summary.slug),
    );
  }

  compare(
    "productRepository.getBySlug(missing)",
    await mockProductRepository.getBySlug("no-such-product"),
    await prismaProductRepository.getBySlug("no-such-product"),
  );

  // --- listBySlugs preserves the caller's order -----------------------------
  const slugs = all.items.slice(0, 5).map((item) => item.slug);
  const reversed = [...slugs].reverse();
  compare(
    "productRepository.listBySlugs(order preserved)",
    await mockProductRepository.listBySlugs(reversed),
    await prismaProductRepository.listBySlugs(reversed),
  );
  compare(
    "productRepository.listBySlugs(empty)",
    await mockProductRepository.listBySlugs([]),
    await prismaProductRepository.listBySlugs([]),
  );
  compare(
    "productRepository.listBySlugs(unknown slug)",
    await mockProductRepository.listBySlugs(["nope", ...slugs.slice(0, 2)]),
    await prismaProductRepository.listBySlugs(["nope", ...slugs.slice(0, 2)]),
  );

  // --- PC Builder slots -----------------------------------------------------
  for (const slot of BUILDER_SLOTS) {
    compare(
      `productRepository.listByBuilderSlot(${slot})`,
      await mockProductRepository.listByBuilderSlot(slot),
      await prismaProductRepository.listByBuilderSlot(slot),
    );
  }

  const builderSlugs = (
    await mockProductRepository.listByBuilderSlot("cpu")
  ).map((item) => item.slug);
  compare(
    "productRepository.listBuilderCandidatesBySlugs(cpu order)",
    await mockProductRepository.listBuilderCandidatesBySlugs(
      [...builderSlugs].reverse(),
    ),
    await prismaProductRepository.listBuilderCandidatesBySlugs(
      [...builderSlugs].reverse(),
    ),
  );
  compare(
    "productRepository.listBuilderCandidatesBySlugs(empty)",
    await mockProductRepository.listBuilderCandidatesBySlugs([]),
    await prismaProductRepository.listBuilderCandidatesBySlugs([]),
  );

  console.log(
    failures === 0
      ? `\nparity ok — ${checks} checks matched`
      : `\nparity FAILED — ${failures} of ${checks} checks differ`,
  );
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    "parity check failed —",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exitCode = 1;
});
