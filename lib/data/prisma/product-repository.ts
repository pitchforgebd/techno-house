import { BRAND_FACET_KEY } from "@/lib/catalog/listing-params";
import { loadProductPresetLookup } from "@/lib/catalog/product-notes-labels-server";
import { effectiveStorefrontPricing } from "@/lib/catalog/discount-pricing";
import {
  PLACEHOLDER_IMAGE_SRC,
  toBuilderCandidate,
  toDbBuilderSlot,
  toProductDetail,
  toProductSummary,
  toStockStatus,
} from "@/lib/data/prisma/mappers";
import type { ProductRepository } from "@/lib/data/repositories/product-repository";
import { isPickerEligible } from "@/lib/domain/pc-builder/picker-eligibility";
import type {
  Facet,
  ProductListQuery,
  ProductSearchSuggestion,
  ProductSort,
} from "@/lib/data/types/catalog";
import { getPrisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { CURRENCY_CODE } from "@/lib/format/currency";
import {
  escapeLikePattern,
  normalizeSearchNeedle,
  splitSearchWords,
} from "@/lib/search/query";

/**
 * Upper bound on parts loaded for one PC Builder slot. The slot picker ranks
 * and filters candidates for compatibility in the browser, so anything cut
 * here can never be suggested — at 48 it silently dropped most of a 120+
 * motherboard / RAM catalog before filtering even began. Sized well above the
 * largest real slot (~140); still a ceiling, not "the whole catalog".
 */
const MAX_SLOT_CANDIDATES = 500;
const MAX_PAGE_SIZE = 48;

const IN_STOCK: Prisma.EnumStockStatusFilter = {
  in: ["IN_STOCK", "LOW_STOCK"],
};

const SUGGESTION_SELECT = {
  slug: true,
  name: true,
  priceAmount: true,
  compareAtAmount: true,
  discountStartsAt: true,
  discountEndsAt: true,
  isSale: true,
  stockStatus: true,
  images: {
    select: { src: true, alt: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    take: 1,
  },
} satisfies Prisma.ProductSelect;

const SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  sku: true,
  priceAmount: true,
  compareAtAmount: true,
  discountStartsAt: true,
  discountEndsAt: true,
  stockStatus: true,
  createdAt: true,
  isNew: true,
  isSale: true,
  brand: { select: { slug: true, name: true } },
  category: { select: { slug: true } },
  warranty: { select: { label: true, logoSrc: true } },
  labelIds: true,
  images: {
    select: { src: true, alt: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    take: 1,
  },
  specChips: {
    select: { label: true, value: true },
    orderBy: { position: "asc" },
  },
} satisfies Prisma.ProductSelect;

const CANDIDATE_SELECT = {
  ...SUMMARY_SELECT,
  builderSlot: true,
  builderSocket: true,
  builderRamType: true,
  builderFormFactor: true,
  builderTdpWatts: true,
  builderStorageInterface: true,
} satisfies Prisma.ProductSelect;

const DETAIL_SELECT = {
  ...CANDIDATE_SELECT,
  overview: true,
  overviewHtml: true,
  detailsHtml: true,
  youtubeUrl: true,
  pdfSpecificationSrc: true,
  noteIds: true,
  colors: {
    select: {
      id: true,
      name: true,
      hex: true,
      images: {
        select: { src: true, alt: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  },
  images: {
    select: { src: true, alt: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
  },
  specGroups: {
    select: {
      title: true,
      rows: {
        select: { label: true, value: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { position: "asc" },
  },
  attributeValues: {
    select: {
      value: true,
      attribute: { select: { key: true, label: true } },
    },
    orderBy: { position: "asc" },
  },
  relatedTo: {
    select: { slug: true },
    // The link table carries no ordering, so fall back to catalogue order.
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ProductSelect;

/**
 * Sort order.
 *
 * `featured` is merchandising order (`Product.position`). `discount` cannot
 * be expressed here because it compares two columns; see `list`.
 */
const ORDER_BY: Record<
  Exclude<ProductSort, "discount">,
  Prisma.ProductOrderByWithRelationInput[]
> = {
  featured: [{ position: "asc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  price_asc: [{ priceAmount: "asc" }, { id: "asc" }],
  price_desc: [{ priceAmount: "desc" }, { id: "asc" }],
};

/**
 * Every descendant of `slug`, so a parent category lists the products filed
 * under its children. The tree is small and fully cached by the caller's
 * request, so this is one query rather than a recursive CTE.
 */
async function categoryTreeSlugs(slug: string): Promise<string[]> {
  const categories = await getPrisma().category.findMany({
    select: { slug: true, parent: { select: { slug: true } } },
  });

  const slugs = new Set<string>([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      const parentSlug = category.parent?.slug;
      if (parentSlug && slugs.has(parentSlug) && !slugs.has(category.slug)) {
        slugs.add(category.slug);
        grew = true;
      }
    }
  }
  return [...slugs];
}

/** Which already-applied filter to leave out — see `buildFacets`. */
type WhereExclusion = { brand?: boolean; attributeKey?: string };

function composeWhere(
  query: ProductListQuery,
  categorySlugs: string[] | null,
  exclude: WhereExclusion = {},
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (categorySlugs) {
    where.category = { slug: { in: categorySlugs } };
  }

  // `brandSlug` is the brand page itself — page context, not a tick box the
  // shopper can clear — so it is never excluded. `brandSlugs` is the facet.
  const brandSlugs = query.brandSlug
    ? [query.brandSlug]
    : exclude.brand
      ? []
      : (query.brandSlugs ?? []);
  if (brandSlugs.length > 0) {
    where.brand = { slug: { in: brandSlugs } };
  }

  if (query.inStockOnly) {
    where.stockStatus = IN_STOCK;
  }

  if (query.onSaleOnly) {
    where.isSale = true;
  }

  if (query.minPrice != null || query.maxPrice != null) {
    where.priceAmount = {
      ...(query.minPrice != null ? { gte: query.minPrice } : {}),
      ...(query.maxPrice != null ? { lte: query.maxPrice } : {}),
    };
  }

  const textMatches = (text: string): Prisma.ProductWhereInput[] => [
    { name: { contains: text, mode: "insensitive" } },
    { sku: { contains: text, mode: "insensitive" } },
    { brand: { name: { contains: text, mode: "insensitive" } } },
    { brand: { slug: { contains: text, mode: "insensitive" } } },
    { category: { name: { contains: text, mode: "insensitive" } } },
    { category: { slug: { contains: text, mode: "insensitive" } } },
  ];
  // Word mode (compare picker): each word must match somewhere, in any order.
  const searchWords = query.qWords ? splitSearchWords(query.q) : [];
  const needle = normalizeSearchNeedle(query.q);
  if (searchWords.length > 0) {
    // `%` and `_` are escaped so a typed character matches itself, not "anything".
    where.AND = searchWords.map((word) => ({
      OR: textMatches(escapeLikePattern(word)),
    }));
  } else if (needle) {
    where.OR = textMatches(needle);
  }

  // Each active filter must match, so they are separate `some` clauses rather
  // than one clause with every value in it.
  const attributeFilters = Object.entries(query.filters ?? {}).filter(
    ([key, values]) => values.length > 0 && key !== exclude.attributeKey,
  );
  if (attributeFilters.length > 0) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      ...attributeFilters.map(([key, values]) => ({
        attributeValues: {
          some: { attribute: { key }, value: { in: values } },
        },
      })),
    ];
  }

  return where;
}

function normalizePage(page: number, pageSize: number) {
  return {
    page: Math.max(1, page),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)),
  };
}

/**
 * Facet counts cover the whole matched set, not the current page.
 *
 * Every *other* active filter narrows a facet, but a facet is never narrowed
 * by its own selection: ticking one brand must not drop every other brand
 * from the brand list, or a second brand could never be ticked. Filters now
 * apply on click (no submit button), so the list a shopper sees after one
 * tick is the only list they get — this exclusion is what keeps multi-select
 * possible. Counting happens in the database via `groupBy`.
 *
 * A facet with nothing selected shares one grouped query against the plain
 * where, so the common unfiltered case costs exactly what it used to; only
 * the facets actually being filtered on need a query of their own.
 */
async function buildFacets(
  query: ProductListQuery,
  categorySlugs: string[] | null,
  filterKeys: string[],
  includeBrandFacet: boolean,
): Promise<Facet[]> {
  const facets: Facet[] = [];
  const baseWhere = composeWhere(query, categorySlugs);

  if (includeBrandFacet) {
    const [grouped, brands] = await Promise.all([
      getPrisma().product.groupBy({
        by: ["brandId"],
        where: composeWhere(query, categorySlugs, { brand: true }),
        _count: { _all: true },
      }),
      getPrisma().brand.findMany({ select: { id: true, slug: true } }),
    ]);
    const slugById = new Map(brands.map((brand) => [brand.id, brand.slug]));
    const values = grouped
      .map((entry) => ({
        value: slugById.get(entry.brandId) ?? "",
        count: entry._count._all,
      }))
      .filter((entry) => entry.value !== "")
      .sort((left, right) => left.value.localeCompare(right.value));
    if (values.length > 0) {
      facets.push({ key: BRAND_FACET_KEY, values });
    }
  }

  const attributeKeys = filterKeys.filter((key) => key !== BRAND_FACET_KEY);
  if (attributeKeys.length === 0) {
    return facets;
  }

  const attributes = await getPrisma().productAttribute.findMany({
    where: { key: { in: attributeKeys } },
    select: { id: true, key: true },
  });
  const keyById = new Map(attributes.map((item) => [item.id, item.key]));
  const idByKey = new Map(attributes.map((item) => [item.key, item.id]));

  const selectedKeys = attributeKeys.filter(
    (key) => (query.filters?.[key] ?? []).length > 0,
  );
  const sharedKeys = attributeKeys.filter((key) => !selectedKeys.includes(key));

  const byKey = new Map<string, { value: string; count: number }[]>();
  const pending: Promise<void>[] = [];

  if (sharedKeys.length > 0) {
    pending.push(
      getPrisma()
        .productAttributeValue.groupBy({
          by: ["attributeId", "value"],
          where: { attribute: { key: { in: sharedKeys } }, product: baseWhere },
          _count: { _all: true },
        })
        .then((grouped) => {
          for (const entry of grouped) {
            const key = keyById.get(entry.attributeId);
            if (!key) {
              continue;
            }
            const bucket = byKey.get(key) ?? [];
            bucket.push({ value: entry.value, count: entry._count._all });
            byKey.set(key, bucket);
          }
        }),
    );
  }

  for (const key of selectedKeys) {
    const attributeId = idByKey.get(key);
    if (!attributeId) {
      continue;
    }
    pending.push(
      getPrisma()
        .productAttributeValue.groupBy({
          by: ["value"],
          where: {
            attributeId,
            product: composeWhere(query, categorySlugs, { attributeKey: key }),
          },
          _count: { _all: true },
        })
        .then((grouped) => {
          byKey.set(
            key,
            grouped.map((entry) => ({
              value: entry.value,
              count: entry._count._all,
            })),
          );
        }),
    );
  }

  await Promise.all(pending);

  // Presented in the order the category declares its filters.
  for (const key of attributeKeys) {
    const values = byKey.get(key);
    if (!values || values.length === 0) {
      continue;
    }
    facets.push({
      key,
      values: values.sort((left, right) =>
        left.value.localeCompare(right.value),
      ),
    });
  }

  return facets;
}

/**
 * Filter keys for the facet list: the category's own declaration when it has
 * one, otherwise filterable attributes present on the matched products.
 */
async function resolveFilterKeys(
  where: Prisma.ProductWhereInput,
  categorySlug: string | undefined,
): Promise<string[]> {
  if (categorySlug) {
    const category = await getPrisma().category.findUnique({
      where: { slug: categorySlug },
      select: { filterKeys: true },
    });
    if (category && category.filterKeys.length > 0) {
      return category.filterKeys;
    }
  }

  const present = await getPrisma().productAttribute.findMany({
    where: {
      isFilterable: true,
      values: { some: { product: where } },
    },
    select: { key: true },
  });

  return present.map((attribute) => attribute.key).sort();
}

export const prismaProductRepository: ProductRepository = {
  async getBySlug(slug) {
    const row = await getPrisma().product.findFirst({
      where: { slug, isActive: true },
      select: DETAIL_SELECT,
    });
    const presets = await loadProductPresetLookup();
    return row ? toProductDetail(row, presets) : null;
  },

  async listBySlugs(slugs) {
    if (slugs.length === 0) {
      return [];
    }
    const rows = await getPrisma().product.findMany({
      where: { slug: { in: slugs }, isActive: true },
      select: SUMMARY_SELECT,
    });

    // Callers pass a meaningful order (cart lines, a saved build), so restore it.
    const presets = await loadProductPresetLookup();
    const order = new Map(slugs.map((slug, index) => [slug, index]));
    return rows
      .sort(
        (left, right) =>
          (order.get(left.slug) ?? 0) - (order.get(right.slug) ?? 0),
      )
      .map((row) => toProductSummary(row, presets));
  },

  async listByBuilderSlot(slot) {
    // The picker offers only parts a customer can actually buy for a desktop
    // (AD-356): in stock in SQL, then laptop parts dropped by the shared rule.
    // Fetch a bit more than the cap so dropping laptop parts cannot leave the
    // list short, then cut to the cap.
    const rows = await getPrisma().product.findMany({
      where: {
        builderSlot: toDbBuilderSlot(slot),
        isActive: true,
        stockStatus: IN_STOCK,
      },
      select: CANDIDATE_SELECT,
      orderBy: [{ position: "asc" }, { id: "asc" }],
      take: MAX_SLOT_CANDIDATES * 2,
    });
    const presets = await loadProductPresetLookup();
    return rows
      .map((row) => toBuilderCandidate(row, presets))
      .filter(isPickerEligible)
      .slice(0, MAX_SLOT_CANDIDATES);
  },

  async listBuilderCandidatesBySlugs(slugs) {
    if (slugs.length === 0) {
      return [];
    }
    const rows = await getPrisma().product.findMany({
      where: { slug: { in: slugs }, isActive: true },
      select: CANDIDATE_SELECT,
    });
    const presets = await loadProductPresetLookup();
    const order = new Map(slugs.map((slug, index) => [slug, index]));
    return rows
      .sort(
        (left, right) =>
          (order.get(left.slug) ?? 0) - (order.get(right.slug) ?? 0),
      )
      .map((row) => toBuilderCandidate(row, presets));
  },

  async list(query) {
    const { page, pageSize } = normalizePage(query.page, query.pageSize);
    const categorySlugs = query.categorySlug
      ? await categoryTreeSlugs(query.categorySlug)
      : null;
    const where = composeWhere(query, categorySlugs);

    const filterKeys = await resolveFilterKeys(where, query.categorySlug);
    const [total, facets] = await Promise.all([
      getPrisma().product.count({ where }),
      buildFacets(query, categorySlugs, filterKeys, !query.brandSlug),
    ]);

    const presets = await loadProductPresetLookup();
    const items =
      query.sort === "discount"
        ? await listByDiscount(where, page, pageSize)
        : await getPrisma()
            .product.findMany({
              where,
              select: SUMMARY_SELECT,
              orderBy: ORDER_BY[query.sort ?? "featured"],
              skip: (page - 1) * pageSize,
              take: pageSize,
            })
            .then((rows) => rows.map((row) => toProductSummary(row, presets)));

    return { items, total, page, pageSize, facets };
  },

  async searchSuggestions(q, limit) {
    const needle = normalizeSearchNeedle(q);
    if (!needle) {
      return { items: [], total: 0 };
    }
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      OR: [
        { name: { contains: needle, mode: "insensitive" } },
        { sku: { contains: needle, mode: "insensitive" } },
        { brand: { name: { contains: needle, mode: "insensitive" } } },
        { category: { name: { contains: needle, mode: "insensitive" } } },
      ],
    };
    const [total, rows] = await Promise.all([
      getPrisma().product.count({ where }),
      getPrisma().product.findMany({
        where,
        select: SUGGESTION_SELECT,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);
    return {
      total,
      items: rows.map((row): ProductSearchSuggestion => {
        const priced = effectiveStorefrontPricing({
          priceAmount: row.priceAmount,
          compareAtAmount: row.compareAtAmount,
          discountStartsAt: row.discountStartsAt,
          discountEndsAt: row.discountEndsAt,
          isSale: row.isSale,
        });
        const image = row.images[0];
        return {
          slug: row.slug,
          name: row.name,
          image: image
            ? { src: image.src, alt: image.alt }
            : { src: PLACEHOLDER_IMAGE_SRC, alt: row.name },
          price: { amount: priced.priceAmount, currency: CURRENCY_CODE },
          compareAtPrice:
            priced.compareAtAmount != null
              ? { amount: priced.compareAtAmount, currency: CURRENCY_CODE }
              : null,
          stockStatus: toStockStatus(row.stockStatus),
        };
      }),
    };
  },

  async listCategoryBrandPairs() {
    const rows = await getPrisma().product.findMany({
      where: { isActive: true },
      select: {
        category: { select: { slug: true } },
        brand: { select: { slug: true, name: true } },
      },
    });
    return rows.map((row) => ({
      categorySlug: row.category.slug,
      brandSlug: row.brand.slug,
      brandName: row.brand.name,
    }));
  },
};

/**
 * Discount sorting compares two columns, which Prisma's `orderBy` cannot do.
 * Rather than duplicate the filter tree in raw SQL, this reads the matched
 * rows at their narrowest — three integers each — sorts, and then fetches only
 * the page. Worth revisiting with a stored discount column if the catalogue
 * grows large enough for that projection to hurt.
 */
async function listByDiscount(
  where: Prisma.ProductWhereInput,
  page: number,
  pageSize: number,
) {
  const candidates = await getPrisma().product.findMany({
    where,
    select: { id: true, priceAmount: true, compareAtAmount: true },
    // Products with an equal discount keep catalogue order, so the sort below
    // (which is stable) produces the same page on every run.
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  const presets = await loadProductPresetLookup();
  const pageIds = candidates
    .map((row) => ({
      id: row.id,
      discount:
        row.compareAtAmount == null ? 0 : row.compareAtAmount - row.priceAmount,
    }))
    .sort((left, right) => right.discount - left.discount)
    .slice((page - 1) * pageSize, page * pageSize)
    .map((row) => row.id);

  if (pageIds.length === 0) {
    return [];
  }

  const rows = await getPrisma().product.findMany({
    where: { id: { in: pageIds } },
    select: SUMMARY_SELECT,
  });

  const order = new Map(pageIds.map((id, index) => [id, index]));
  return rows
    .sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    )
    .map((row) => toProductSummary(row, presets));
}
