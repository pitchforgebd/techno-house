/**
 * Admin product persistence (P12-T04).
 *
 * Storefront reads stay on ProductRepository (active rows only). These
 * helpers include unpublished products and write to PostgreSQL.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { parseProductInput } from "@/lib/catalog/product-input-server";
import type {
  ParsedProductInput,
  ProductInputFields,
} from "@/lib/catalog/product-input";
import { chipsFromSpecGroups } from "@/lib/catalog/spec-group-input";
import { upsertProductStock } from "@/lib/catalog/admin-inventory";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  deriveStockStatus,
} from "@/lib/catalog/inventory-input";
import {
  toBuilderSlot,
  toDbBuilderSlot,
  toDbStockStatus,
  toProductDetail,
  toProductSummary,
  type ProductDetailRow,
  type ProductSummaryRow,
} from "@/lib/data/prisma/mappers";
import type { ProductDetail, ProductSummary } from "@/lib/data/types/catalog";
import type { StockStatus } from "@/lib/data/types/common";
import type { ProductPresetLookup } from "@/lib/catalog/product-notes-labels";
import { loadProductPresetLookup } from "@/lib/catalog/product-notes-labels-server";
import { getPrisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export const PRODUCT_DB_REQUIRED =
  "Product changes need the database. Turn off DATA_SOURCE=mock to save.";

export type ProductMutationResult =
  { ok: true; id: string; slug: string } | { ok: false; formError: string };

export type ProductActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type AdminProductVariantView = {
  id: string;
  name: string;
  sku: string;
  priceAmount: number;
  compareAtAmount: number | null;
  isActive: boolean;
  quantity: number;
};

export type AdminProductListItem = ProductSummary & {
  isActive: boolean;
  position: number;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  avgRating: number;
  reviewCount: number;
  salesCount: number;
};

export type AdminProductEditor = ProductDetail & {
  isActive: boolean;
  position: number;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  variants: AdminProductVariantView[];
  barcode: string;
  /** Full records (not just `relatedSlugs`) so the picker can show real names. */
  relatedProducts: { id: string; slug: string; name: string }[];
};

export type AdminProductListQuery = {
  q?: string;
  categorySlug?: string | null;
  stock?: "all" | StockStatus;
  sort?: "featured" | "newest" | "price_asc" | "price_desc" | "discount";
  tab?: "all" | "inhouse" | "drafts";
  page: number;
  pageSize: number;
};

const PLACEHOLDER_IMAGE_SRC = "/products/placeholder.svg";

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
  isNew: true,
  isSale: true,
  isActive: true,
  position: true,
  brand: { select: { slug: true, name: true } },
  category: { select: { slug: true } },
  warranty: { select: { label: true } },
  noteIds: true,
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
  stock: {
    select: { quantity: true, reserved: true, lowStockThreshold: true },
  },
} satisfies Prisma.ProductSelect;

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  overview: true,
  youtubeUrl: true,
  pdfSpecificationSrc: true,
  barcode: true,
  builderSlot: true,
  builderSocket: true,
  builderRamType: true,
  builderFormFactor: true,
  builderTdpWatts: true,
  builderStorageInterface: true,
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
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: "asc" },
  },
  variants: {
    select: {
      id: true,
      name: true,
      sku: true,
      priceAmount: true,
      compareAtAmount: true,
      isActive: true,
      stock: { select: { quantity: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.ProductSelect;

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

async function recordProductAudit(
  actor: ProductActor | undefined,
  action: string,
  record: { id: string; slug: string; name: string },
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType: "Product",
    entityId: record.id,
    ip: actor.ip,
    metadata: { slug: record.slug, name: record.name, ...metadata },
  });
}

function toListItem(
  row: ProductSummaryRow & {
    isActive: boolean;
    position: number;
    stock: {
      quantity: number;
      reserved: number;
      lowStockThreshold: number;
    } | null;
  },
  presets: ProductPresetLookup,
  stats: { avgRating: number; reviewCount: number; salesCount: number },
): AdminProductListItem {
  return {
    ...toProductSummary(row, presets),
    isActive: row.isActive,
    position: row.position,
    quantity: row.stock?.quantity ?? 0,
    reserved: row.stock?.reserved ?? 0,
    lowStockThreshold: row.stock?.lowStockThreshold ?? 5,
    avgRating: stats.avgRating,
    reviewCount: stats.reviewCount,
    salesCount: stats.salesCount,
  };
}

const EMPTY_LIST_STATS = { avgRating: 0, reviewCount: 0, salesCount: 0 };

/**
 * Real published-review average + units sold, scoped to just the ids on this
 * page (not the whole catalogue) — was `mockProductRating()`/`mockSalesCount()`,
 * hash-derived fake numbers with no relation to real data. "Sold" mirrors the
 * Report Center's Product Sales definition (`lib/admin/load-report-center.ts`):
 * `OrderItem.quantity` summed across paid orders.
 */
async function loadListStats(
  productIds: string[],
): Promise<Map<string, { avgRating: number; reviewCount: number; salesCount: number }>> {
  const map = new Map<
    string,
    { avgRating: number; reviewCount: number; salesCount: number }
  >();
  if (productIds.length === 0) {
    return map;
  }
  const prisma = getPrisma();
  const [ratings, sold] = await Promise.all([
    prisma.productReview.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        order: { paymentStatus: "PAID" },
      },
      _sum: { quantity: true },
    }),
  ]);
  for (const row of ratings) {
    map.set(row.productId, {
      avgRating: Math.round((row._avg.rating ?? 0) * 10) / 10,
      reviewCount: row._count._all,
      salesCount: 0,
    });
  }
  for (const row of sold) {
    if (!row.productId) {
      continue;
    }
    const existing = map.get(row.productId) ?? { ...EMPTY_LIST_STATS };
    existing.salesCount = row._sum.quantity ?? 0;
    map.set(row.productId, existing);
  }
  return map;
}

function toEditor(
  row: ProductDetailRow & {
    isActive: boolean;
    position: number;
    barcode: string | null;
    relatedTo: { id: string; slug: string; name: string }[];
    stock: {
      quantity: number;
      reserved: number;
      lowStockThreshold: number;
    } | null;
    variants: Array<
      Omit<AdminProductVariantView, "quantity"> & {
        stock: { quantity: number } | null;
      }
    >;
  },
  presets: ProductPresetLookup,
): AdminProductEditor {
  const detail = toProductDetail(row, presets);
  return {
    ...detail,
    // Editor must see configured list/sale prices, not the time-windowed
    // storefront effective price (otherwise discount fields reset to 0).
    price: { amount: row.priceAmount, currency: detail.price.currency },
    compareAtPrice:
      row.compareAtAmount == null
        ? null
        : { amount: row.compareAtAmount, currency: detail.price.currency },
    isSale: row.isSale,
    discountStartsAt: row.discountStartsAt?.toISOString() ?? null,
    discountEndsAt: row.discountEndsAt?.toISOString() ?? null,
    isActive: row.isActive,
    position: row.position,
    quantity: row.stock?.quantity ?? 0,
    reserved: row.stock?.reserved ?? 0,
    lowStockThreshold: row.stock?.lowStockThreshold ?? 5,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceAmount: variant.priceAmount,
      compareAtAmount: variant.compareAtAmount,
      isActive: variant.isActive,
      quantity: variant.stock?.quantity ?? 0,
    })),
    barcode: row.barcode ?? "",
    relatedProducts: row.relatedTo,
  };
}

async function categoryTreeSlugs(slug: string): Promise<string[]> {
  const rows = await getPrisma().category.findMany({
    select: { slug: true, parent: { select: { slug: true } } },
  });
  const children = new Map<string, string[]>();
  for (const row of rows) {
    const parent = row.parent?.slug;
    if (!parent) {
      continue;
    }
    const list = children.get(parent) ?? [];
    list.push(row.slug);
    children.set(parent, list);
  }
  const slugs = new Set<string>([slug]);
  const stack = [slug];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }
    for (const child of children.get(current) ?? []) {
      if (!slugs.has(child)) {
        slugs.add(child);
        stack.push(child);
      }
    }
  }
  return [...slugs];
}

function warrantyCode(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function warrantyMonths(label: string): number | null {
  const years = /(\d+)\s*year/i.exec(label);
  if (years?.[1]) {
    return Number(years[1]) * 12;
  }
  const months = /(\d+)\s*month/i.exec(label);
  if (months?.[1]) {
    return Number(months[1]);
  }
  return null;
}

async function resolveWarrantyId(label: string | null): Promise<string | null> {
  if (!label) {
    return null;
  }
  const code = warrantyCode(label);
  if (!code) {
    return null;
  }
  const row = await getPrisma().productWarranty.upsert({
    where: { code },
    create: {
      code,
      label,
      months: warrantyMonths(label),
      isActive: true,
    },
    update: { label, months: warrantyMonths(label) },
    select: { id: true },
  });
  return row.id;
}

async function skuTakenByOther(
  sku: string,
  productId?: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const [product, variant] = await Promise.all([
    prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    }),
    prisma.productVariant.findUnique({
      where: { sku },
      select: { productId: true },
    }),
  ]);
  if (product && product.id !== productId) {
    return true;
  }
  if (variant && variant.productId !== productId) {
    return true;
  }
  return false;
}

/** `barcode` is nullable + unique — a blank value never collides. */
async function barcodeTakenByOther(
  barcode: string | null,
  productId?: string,
): Promise<boolean> {
  if (!barcode) {
    return false;
  }
  const existing = await getPrisma().product.findUnique({
    where: { barcode },
    select: { id: true },
  });
  return Boolean(existing && existing.id !== productId);
}

async function syncVariants(
  prisma: Prisma.TransactionClient,
  productId: string,
  variants: ParsedProductInput["variants"],
): Promise<
  | { ok: true; stocks: { variantId: string; quantity: number }[] }
  | { ok: false; formError: string }
> {
  const existing = await prisma.productVariant.findMany({
    where: { productId },
    select: { id: true, sku: true },
  });
  const keepIds = new Set<string>();
  const variantStocks: { variantId: string; quantity: number }[] = [];

  for (const variant of variants) {
    const clash = await prisma.productVariant.findUnique({
      where: { sku: variant.sku },
      select: { id: true, productId: true },
    });
    if (clash && clash.productId !== productId) {
      return { ok: false, formError: "A variant SKU is already in use." };
    }
    const match = existing.find(
      (row) => row.sku.toLowerCase() === variant.sku.toLowerCase(),
    );
    if (match) {
      await prisma.productVariant.update({
        where: { id: match.id },
        data: {
          sku: variant.sku,
          name: variant.name,
          priceAmount: variant.priceAmount,
          compareAtAmount: variant.compareAtAmount,
          isActive: variant.isActive,
        },
      });
      keepIds.add(match.id);
      variantStocks.push({ variantId: match.id, quantity: variant.quantity });
      continue;
    }
    const created = await prisma.productVariant.create({
      data: {
        productId,
        sku: variant.sku,
        name: variant.name,
        priceAmount: variant.priceAmount,
        compareAtAmount: variant.compareAtAmount,
        isActive: variant.isActive,
      },
      select: { id: true },
    });
    keepIds.add(created.id);
    variantStocks.push({ variantId: created.id, quantity: variant.quantity });
  }

  const stale = existing.filter((row) => !keepIds.has(row.id));
  if (stale.length > 0) {
    await prisma.productVariant.deleteMany({
      where: { id: { in: stale.map((row) => row.id) } },
    });
  }
  return { ok: true, stocks: variantStocks };
}

async function syncAttributeValues(
  prisma: Prisma.TransactionClient,
  productId: string,
  attributes: ParsedProductInput["attributes"],
): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (attributes.length === 0) {
    await prisma.productAttributeValue.deleteMany({ where: { productId } });
    return { ok: true };
  }

  const defs = await prisma.productAttribute.findMany({
    where: { key: { in: attributes.map((item) => item.key) } },
    select: { id: true, key: true },
  });
  const idByKey = new Map(defs.map((row) => [row.key, row.id]));

  for (const item of attributes) {
    if (!idByKey.has(item.key)) {
      return {
        ok: false,
        formError: `Attribute “${item.key}” is not defined. Create it under Attributes first.`,
      };
    }
  }

  await prisma.productAttributeValue.deleteMany({ where: { productId } });
  await prisma.productAttributeValue.createMany({
    data: attributes.map((item, index) => ({
      productId,
      attributeId: idByKey.get(item.key)!,
      value: item.value,
      position: index,
    })),
  });

  return { ok: true };
}

async function syncProductColors(
  prisma: Prisma.TransactionClient,
  productId: string,
  colors: ParsedProductInput["colors"],
): Promise<{ ok: true } | { ok: false; formError: string }> {
  const existing = await prisma.productColor.findMany({
    where: { productId },
    select: { id: true, name: true },
  });
  const byName = new Map(
    existing.map((row) => [row.name.toLowerCase(), row.id]),
  );
  const keepIds = new Set<string>();

  for (const [index, color] of colors.entries()) {
    const matchedId = byName.get(color.name.toLowerCase());
    let colorId: string;
    if (matchedId) {
      await prisma.productColor.update({
        where: { id: matchedId },
        data: {
          name: color.name,
          hex: color.hex,
          position: index,
        },
      });
      colorId = matchedId;
      keepIds.add(matchedId);
    } else {
      const created = await prisma.productColor.create({
        data: {
          productId,
          name: color.name,
          hex: color.hex,
          position: index,
        },
        select: { id: true },
      });
      colorId = created.id;
      keepIds.add(created.id);
    }

    await prisma.productColorImage.deleteMany({ where: { colorId } });
    if (color.images.length > 0) {
      await prisma.productColorImage.createMany({
        data: color.images.map((src, imageIndex) => ({
          colorId,
          src,
          alt: `${color.name} ${imageIndex + 1}`,
          position: imageIndex,
        })),
      });
    }
  }

  await prisma.productColor.deleteMany({
    where: {
      productId,
      ...(keepIds.size > 0 ? { id: { notIn: [...keepIds] } } : {}),
    },
  });
  return { ok: true };
}

async function syncSpecGroups(
  prisma: Prisma.TransactionClient,
  productId: string,
  groups: ParsedProductInput["specGroups"],
): Promise<{ ok: true } | { ok: false; formError: string }> {
  await prisma.productSpecGroup.deleteMany({ where: { productId } });
  await prisma.productSpecChip.deleteMany({ where: { productId } });

  for (const [index, group] of groups.entries()) {
    await prisma.productSpecGroup.create({
      data: {
        productId,
        title: group.title,
        position: index,
        rows: {
          create: group.rows.map((row, rowIndex) => ({
            label: row.key,
            value: row.value,
            position: rowIndex,
          })),
        },
      },
    });
  }

  const chips = chipsFromSpecGroups(groups);
  if (chips.length > 0) {
    await prisma.productSpecChip.createMany({
      data: chips.map((chip, index) => ({
        productId,
        label: chip.label,
        value: chip.value,
        position: index,
      })),
    });
  }

  return { ok: true };
}

function productData(
  parsed: ParsedProductInput,
  ids: {
    brandId: string;
    categoryId: string;
    warrantyId: string | null;
  },
): Prisma.ProductUncheckedUpdateInput {
  return {
    slug: parsed.slug,
    sku: parsed.sku,
    name: parsed.name,
    brandId: ids.brandId,
    categoryId: ids.categoryId,
    warrantyId: ids.warrantyId,
    overview: parsed.overview,
    priceAmount: parsed.priceAmount,
    compareAtAmount: parsed.compareAtAmount,
    discountStartsAt: parsed.discountStartsAt,
    discountEndsAt: parsed.discountEndsAt,
    stockStatus: toDbStockStatus(parsed.stockStatus),
    isNew: parsed.isNew,
    isSale: parsed.isSale,
    isActive: parsed.isActive,
    position: parsed.position,
    weightGrams: parsed.weightGrams,
    publishedAt: parsed.isActive ? new Date() : null,
    builderSlot: parsed.builderSlot
      ? toDbBuilderSlot(parsed.builderSlot)
      : null,
    builderSocket: parsed.builderAttrs?.socket ?? null,
    builderRamType: parsed.builderAttrs?.ramType ?? null,
    builderFormFactor: parsed.builderAttrs?.formFactor ?? null,
    builderTdpWatts: parsed.builderAttrs?.tdpWatts ?? null,
    builderStorageInterface: parsed.builderAttrs?.storageInterface ?? null,
    youtubeUrl: parsed.youtubeUrl,
    pdfSpecificationSrc: parsed.pdfSpecificationSrc,
    noteIds: parsed.noteIds,
    labelIds: parsed.labelIds,
    barcode: parsed.barcode,
    // `relatedTo` is an implicit self-relation, not a scalar column, so it
    // must go through relation syntax even in an "Unchecked" update input.
    // `set` replaces the full list — correct for a form that submits the
    // complete current selection every save.
    relatedTo: { set: parsed.relatedProductIds.map((id) => ({ id })) },
  };
}

/**
 * Thrown inside `$transaction` to convert a step's `{ ok: false }` result
 * into a real rollback — returning that object instead of throwing would let
 * Prisma commit whatever writes already happened in earlier steps.
 */
class PersistRollback extends Error {
  constructor(public readonly result: { ok: false; formError: string }) {
    super(result.formError);
  }
}

async function persistParsed(
  parsed: ParsedProductInput,
  currentId: string | undefined,
  actor?: ProductActor,
): Promise<ProductMutationResult> {
  const prisma = getPrisma();
  const [brand, category] = await Promise.all([
    prisma.brand.findUnique({
      where: { slug: parsed.brandSlug },
      select: { id: true },
    }),
    prisma.category.findUnique({
      where: { slug: parsed.categorySlug },
      select: { id: true },
    }),
  ]);
  if (!brand) {
    return { ok: false, formError: "That brand no longer exists." };
  }
  if (!category) {
    return { ok: false, formError: "That category no longer exists." };
  }

  const slugTaken = await prisma.product.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  for (const variant of parsed.variants) {
    if (await skuTakenByOther(variant.sku, currentId)) {
      return { ok: false, formError: "A variant SKU is already in use." };
    }
  }

  const warrantyId = await resolveWarrantyId(parsed.warrantyLabel);
  const data = productData(parsed, {
    brandId: brand.id,
    categoryId: category.id,
    warrantyId,
  });

  if (currentId) {
    const existing = await prisma.product.findUnique({
      where: { id: currentId },
      select: { id: true, slug: true, name: true, publishedAt: true },
    });
    if (!existing) {
      return { ok: false, formError: "That product no longer exists." };
    }
    if (slugTaken && slugTaken.id !== existing.id) {
      return { ok: false, formError: "That URL slug is already in use." };
    }
    if (await skuTakenByOther(parsed.sku, existing.id)) {
      return { ok: false, formError: "That SKU is already in use." };
    }
    if (await barcodeTakenByOther(parsed.barcode, existing.id)) {
      return { ok: false, formError: "That barcode is already in use." };
    }

    const publishedAt = parsed.isActive
      ? (existing.publishedAt ?? new Date())
      : null;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: existing.id },
          data: { ...data, publishedAt },
        });

        if (parsed.thumbnailSrc !== undefined) {
          const primary = await tx.productImage.findFirst({
            where: { productId: existing.id, isPrimary: true },
            select: { id: true },
          });
          const src = parsed.thumbnailSrc || PLACEHOLDER_IMAGE_SRC;
          if (primary) {
            await tx.productImage.update({
              where: { id: primary.id },
              data: { src, alt: parsed.name },
            });
          } else {
            await tx.productImage.create({
              data: {
                productId: existing.id,
                src,
                alt: parsed.name,
                position: 0,
                isPrimary: true,
              },
            });
          }
        }
        if (parsed.gallerySrc) {
          const secondary = await tx.productImage.findFirst({
            where: { productId: existing.id, isPrimary: false },
            orderBy: { position: "asc" },
            select: { id: true },
          });
          if (secondary) {
            await tx.productImage.update({
              where: { id: secondary.id },
              data: { src: parsed.gallerySrc, alt: `${parsed.name} gallery` },
            });
          } else {
            await tx.productImage.create({
              data: {
                productId: existing.id,
                src: parsed.gallerySrc,
                alt: `${parsed.name} gallery`,
                position: 1,
                isPrimary: false,
              },
            });
          }
        }

        const variantsResult = await syncVariants(
          tx,
          existing.id,
          parsed.variants,
        );
        if (!variantsResult.ok) {
          throw new PersistRollback(variantsResult);
        }
        const attributesResult = await syncAttributeValues(
          tx,
          existing.id,
          parsed.attributes,
        );
        if (!attributesResult.ok) {
          throw new PersistRollback(attributesResult);
        }
        const colorsResult = await syncProductColors(
          tx,
          existing.id,
          parsed.colors,
        );
        if (!colorsResult.ok) {
          throw new PersistRollback(colorsResult);
        }
        const specsResult = await syncSpecGroups(
          tx,
          existing.id,
          parsed.specGroups,
        );
        if (!specsResult.ok) {
          throw new PersistRollback(specsResult);
        }
        const stockResult = await upsertProductStock(
          {
            productId: existing.id,
            quantity: parsed.quantity,
            lowStockThreshold: parsed.lowStockThreshold,
            variantStocks: variantsResult.stocks,
          },
          tx,
        );
        if (!stockResult.ok) {
          throw new PersistRollback(stockResult);
        }
      });
    } catch (err) {
      if (err instanceof PersistRollback) {
        return err.result;
      }
      throw err;
    }

    await recordProductAudit(actor, AUDIT_ACTIONS.PRODUCT_UPDATE, existing, {
      slug: parsed.slug,
      isActive: parsed.isActive,
      variantCount: parsed.variants.length,
      attributeCount: parsed.attributes.length,
      specGroupCount: parsed.specGroups.length,
      quantity: parsed.quantity,
      builderSlot: parsed.builderSlot,
    });
    return { ok: true, id: existing.id, slug: parsed.slug };
  }

  if (slugTaken) {
    return { ok: false, formError: "That URL slug is already in use." };
  }
  if (await skuTakenByOther(parsed.sku)) {
    return { ok: false, formError: "That SKU is already in use." };
  }
  if (await barcodeTakenByOther(parsed.barcode)) {
    return { ok: false, formError: "That barcode is already in use." };
  }

  let created: { id: string; slug: string; name: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      const createdRow = await tx.product.create({
        data: {
          slug: parsed.slug,
          sku: parsed.sku,
          name: parsed.name,
          brandId: brand.id,
          categoryId: category.id,
          warrantyId,
          overview: parsed.overview,
          priceAmount: parsed.priceAmount,
          compareAtAmount: parsed.compareAtAmount,
          stockStatus: toDbStockStatus(parsed.stockStatus),
          isNew: parsed.isNew,
          isSale: parsed.isSale,
          isActive: parsed.isActive,
          position: parsed.position,
          weightGrams: parsed.weightGrams,
          publishedAt: parsed.isActive ? new Date() : null,
          builderSlot: parsed.builderSlot
            ? toDbBuilderSlot(parsed.builderSlot)
            : null,
          builderSocket: parsed.builderAttrs?.socket ?? null,
          builderRamType: parsed.builderAttrs?.ramType ?? null,
          builderFormFactor: parsed.builderAttrs?.formFactor ?? null,
          builderTdpWatts: parsed.builderAttrs?.tdpWatts ?? null,
          builderStorageInterface:
            parsed.builderAttrs?.storageInterface ?? null,
          youtubeUrl: parsed.youtubeUrl,
          pdfSpecificationSrc: parsed.pdfSpecificationSrc,
          noteIds: parsed.noteIds,
          labelIds: parsed.labelIds,
          barcode: parsed.barcode,
          relatedTo: {
            connect: parsed.relatedProductIds.map((id) => ({ id })),
          },
        },
        select: { id: true, slug: true, name: true },
      });

      await tx.productImage.create({
        data: {
          productId: createdRow.id,
          src: parsed.thumbnailSrc || PLACEHOLDER_IMAGE_SRC,
          alt: parsed.name,
          position: 0,
          isPrimary: true,
        },
      });
      if (parsed.gallerySrc) {
        await tx.productImage.create({
          data: {
            productId: createdRow.id,
            src: parsed.gallerySrc,
            alt: `${parsed.name} gallery`,
            position: 1,
            isPrimary: false,
          },
        });
      }

      const variantsResult = await syncVariants(
        tx,
        createdRow.id,
        parsed.variants,
      );
      if (!variantsResult.ok) {
        throw new PersistRollback(variantsResult);
      }
      const attributesResult = await syncAttributeValues(
        tx,
        createdRow.id,
        parsed.attributes,
      );
      if (!attributesResult.ok) {
        throw new PersistRollback(attributesResult);
      }
      const colorsResult = await syncProductColors(
        tx,
        createdRow.id,
        parsed.colors,
      );
      if (!colorsResult.ok) {
        throw new PersistRollback(colorsResult);
      }
      const specsResult = await syncSpecGroups(
        tx,
        createdRow.id,
        parsed.specGroups,
      );
      if (!specsResult.ok) {
        throw new PersistRollback(specsResult);
      }
      const stockResult = await upsertProductStock(
        {
          productId: createdRow.id,
          quantity: parsed.quantity,
          lowStockThreshold: parsed.lowStockThreshold,
          variantStocks: variantsResult.stocks,
        },
        tx,
      );
      if (!stockResult.ok) {
        throw new PersistRollback(stockResult);
      }

      return createdRow;
    });
  } catch (err) {
    if (err instanceof PersistRollback) {
      return err.result;
    }
    throw err;
  }

  await recordProductAudit(actor, AUDIT_ACTIONS.PRODUCT_CREATE, created, {
    isActive: parsed.isActive,
    variantCount: parsed.variants.length,
    attributeCount: parsed.attributes.length,
    specGroupCount: parsed.specGroups.length,
    quantity: parsed.quantity,
    builderSlot: parsed.builderSlot,
  });
  return { ok: true, id: created.id, slug: created.slug };
}

export async function listAdminProductRecords(
  query: AdminProductListQuery,
): Promise<{ items: AdminProductListItem[]; total: number }> {
  const prisma = getPrisma();
  const where: Prisma.ProductWhereInput = {};

  if (query.tab === "drafts") {
    where.isActive = false;
  } else if (query.tab === "inhouse") {
    where.isActive = true;
  }

  if (query.stock && query.stock !== "all") {
    where.stockStatus = toDbStockStatus(query.stock);
  }

  if (query.categorySlug) {
    where.category = {
      slug: { in: await categoryTreeSlugs(query.categorySlug) },
    };
  }

  const needle = query.q?.trim();
  if (needle) {
    where.OR = [
      { name: { contains: needle, mode: "insensitive" } },
      { sku: { contains: needle, mode: "insensitive" } },
    ];
  }

  const total = await prisma.product.count({ where });
  const pageSize = Math.max(1, query.pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    query.sort === "newest"
      ? [{ createdAt: "desc" }, { id: "desc" }]
      : query.sort === "price_asc"
        ? [{ priceAmount: "asc" }, { id: "asc" }]
        : query.sort === "price_desc"
          ? [{ priceAmount: "desc" }, { id: "asc" }]
          : [{ position: "asc" }, { id: "asc" }];

  let rows: (ProductSummaryRow & {
    isActive: boolean;
    position: number;
    stock: {
      quantity: number;
      reserved: number;
      lowStockThreshold: number;
    } | null;
  })[];
  if (query.sort === "discount") {
    const candidates = await prisma.product.findMany({
      where,
      select: { id: true, priceAmount: true, compareAtAmount: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    const pageIds = candidates
      .map((row) => ({
        id: row.id,
        discount:
          row.compareAtAmount == null
            ? 0
            : row.compareAtAmount - row.priceAmount,
      }))
      .sort((left, right) => right.discount - left.discount)
      .slice((page - 1) * pageSize, page * pageSize)
      .map((row) => row.id);
    if (pageIds.length === 0) {
      return { items: [], total };
    }
    const found = await prisma.product.findMany({
      where: { id: { in: pageIds } },
      select: SUMMARY_SELECT,
    });
    const order = new Map(pageIds.map((id, index) => [id, index]));
    rows = found.sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    );
  } else {
    rows = await prisma.product.findMany({
      where,
      select: SUMMARY_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  const [presets, stats] = await Promise.all([
    loadProductPresetLookup(),
    loadListStats(rows.map((row) => row.id)),
  ]);
  return {
    items: rows.map((row) =>
      toListItem(row, presets, stats.get(row.id) ?? EMPTY_LIST_STATS),
    ),
    total,
  };
}

export async function getAdminProductRecord(
  id: string,
): Promise<AdminProductEditor | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().product.findUnique({
    where: { id: trimmed },
    select: DETAIL_SELECT,
  });
  const presets = await loadProductPresetLookup();
  return row ? toEditor(row, presets) : null;
}

export async function saveAdminProduct(input: {
  currentId?: string;
  fields: ProductInputFields;
  actor?: ProductActor;
}): Promise<ProductMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: PRODUCT_DB_REQUIRED };
  }
  const parsed = await parseProductInput(input.fields, input.currentId);
  if (!parsed.ok) {
    return parsed;
  }
  return persistParsed(parsed.value, input.currentId, input.actor);
}

const CLONE_SELECT = {
  name: true,
  slug: true,
  sku: true,
  brand: { select: { slug: true } },
  category: { select: { slug: true } },
  position: true,
  weightGrams: true,
  priceAmount: true,
  compareAtAmount: true,
  discountStartsAt: true,
  discountEndsAt: true,
  overview: true,
  isNew: true,
  isSale: true,
  warranty: { select: { label: true } },
  noteIds: true,
  labelIds: true,
  builderSlot: true,
  builderSocket: true,
  builderRamType: true,
  builderFormFactor: true,
  builderTdpWatts: true,
  builderStorageInterface: true,
  youtubeUrl: true,
  pdfSpecificationSrc: true,
  stock: { select: { quantity: true, lowStockThreshold: true } },
  colors: {
    select: {
      name: true,
      hex: true,
      images: { select: { src: true }, orderBy: { position: "asc" as const } },
    },
  },
  images: {
    select: { src: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" as const }, { position: "asc" as const }],
  },
  specGroups: {
    select: {
      title: true,
      rows: {
        select: { label: true, value: true },
        orderBy: { position: "asc" as const },
      },
    },
    orderBy: { position: "asc" as const },
  },
  attributeValues: {
    select: { value: true, attribute: { select: { key: true } } },
  },
  variants: {
    select: {
      name: true,
      sku: true,
      priceAmount: true,
      compareAtAmount: true,
      isActive: true,
      stock: { select: { quantity: true } },
    },
  },
  relatedTo: { select: { id: true } },
} satisfies Prisma.ProductSelect;

/**
 * Deep-clones a product into a new draft (Phase 4) — was a fake "Product
 * duplicated (mock)" toast with no backing mutation on either the product
 * form's "Duplicate" button or the product list's "Make a clone" action.
 *
 * Reuses `persistParsed` (the same create path `saveAdminProduct` calls)
 * rather than writing a second, parallel product-creation transaction —
 * the clone gets identical validation, stock handling, and audit logging
 * for free, and can never drift from how a real create behaves.
 */
export async function cloneAdminProduct(
  id: string,
  actor?: ProductActor,
): Promise<ProductMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: PRODUCT_DB_REQUIRED };
  }
  const prisma = getPrisma();
  const source = await prisma.product.findUnique({
    where: { id },
    select: CLONE_SELECT,
  });
  if (!source) {
    return { ok: false, formError: "That product no longer exists." };
  }

  const baseSlug = `${source.slug}-copy`;
  const baseSku = `${source.sku}-COPY`;
  let slug = baseSlug;
  let sku = baseSku;
  for (let suffix = 2; ; suffix += 1) {
    const [slugTaken, skuTaken] = await Promise.all([
      prisma.product.findUnique({ where: { slug }, select: { id: true } }),
      prisma.product.findUnique({ where: { sku }, select: { id: true } }),
    ]);
    if (!slugTaken && !skuTaken) {
      break;
    }
    slug = `${baseSlug}-${suffix}`;
    sku = `${baseSku}-${suffix}`;
  }

  const primaryImage = source.images.find((image) => image.isPrimary);
  const secondaryImage = source.images.find((image) => !image.isPrimary);

  const cloned: ParsedProductInput = {
    name: `${source.name} (Copy)`,
    slug,
    sku,
    brandSlug: source.brand.slug,
    categorySlug: source.category.slug,
    position: source.position,
    weightGrams: source.weightGrams,
    priceAmount: source.priceAmount,
    compareAtAmount: source.compareAtAmount,
    // A clone starts as a draft (see `isActive` below); a paused discount
    // window would only confuse the admin editing it, so it is not copied.
    discountStartsAt: null,
    discountEndsAt: null,
    overview: source.overview,
    quantity: source.stock?.quantity ?? 0,
    lowStockThreshold: source.stock?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    stockStatus: deriveStockStatus(
      source.stock?.quantity ?? 0,
      0,
      source.stock?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
    ),
    // Starts unpublished — a clone must never silently double a live listing.
    isActive: false,
    isNew: source.isNew,
    isSale: false,
    warrantyLabel: source.warranty?.label ?? null,
    noteIds: source.noteIds,
    labelIds: source.labelIds,
    // Barcodes are unique — copying the source's would collide with it.
    barcode: null,
    relatedProductIds: source.relatedTo.map((related) => related.id),
    variants: source.variants.map((variant) => ({
      name: variant.name,
      sku: `${variant.sku}-COPY-${Date.now().toString(36)}`,
      priceAmount: variant.priceAmount,
      compareAtAmount: variant.compareAtAmount,
      isActive: variant.isActive,
      quantity: variant.stock?.quantity ?? 0,
    })),
    attributes: source.attributeValues.map((attributeValue) => ({
      key: attributeValue.attribute.key,
      value: attributeValue.value,
    })),
    colors: source.colors.map((color) => ({
      name: color.name,
      hex: color.hex,
      images: color.images.map((image) => image.src),
    })),
    specGroups: source.specGroups.map((group) => ({
      title: group.title,
      rows: group.rows.map((row) => ({ key: row.label, value: row.value })),
    })),
    builderSlot: source.builderSlot ? toBuilderSlot(source.builderSlot) : null,
    builderAttrs: source.builderSlot
      ? {
          socket: source.builderSocket ?? undefined,
          ramType: source.builderRamType ?? undefined,
          formFactor: source.builderFormFactor ?? undefined,
          tdpWatts: source.builderTdpWatts ?? undefined,
          storageInterface: source.builderStorageInterface ?? undefined,
        }
      : null,
    youtubeUrl: source.youtubeUrl,
    pdfSpecificationSrc: source.pdfSpecificationSrc,
    thumbnailSrc: primaryImage?.src,
    gallerySrc: secondaryImage?.src,
  };

  const result = await persistParsed(cloned, undefined, actor);
  if (result.ok && actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: actor.staffId,
      actorLabel: actor.email,
      action: AUDIT_ACTIONS.PRODUCT_CLONE,
      entityType: "Product",
      entityId: result.id,
      ip: actor.ip,
      metadata: { sourceProductId: id, sourceSlug: source.slug },
    });
  }
  return result;
}

export async function updateAdminProductFlags(input: {
  id: string;
  published?: boolean;
  featured?: boolean;
  todaysDeal?: boolean;
  actor?: ProductActor;
}): Promise<ProductMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: PRODUCT_DB_REQUIRED };
  }
  const id = input.id.trim();
  if (!id) {
    return { ok: false, formError: "That product no longer exists." };
  }
  const existing = await getPrisma().product.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, publishedAt: true },
  });
  if (!existing) {
    return { ok: false, formError: "That product no longer exists." };
  }

  const data: Prisma.ProductUpdateInput = {};
  if (input.published !== undefined) {
    data.isActive = input.published;
    data.publishedAt = input.published
      ? (existing.publishedAt ?? new Date())
      : null;
  }
  if (input.featured !== undefined) {
    data.isNew = input.featured;
  }
  if (input.todaysDeal !== undefined) {
    data.isSale = input.todaysDeal;
  }
  if (Object.keys(data).length === 0) {
    return { ok: true, id: existing.id, slug: existing.slug };
  }

  await getPrisma().product.update({ where: { id: existing.id }, data });
  await recordProductAudit(
    input.actor,
    AUDIT_ACTIONS.PRODUCT_UPDATE,
    existing,
    {
      flags: {
        published: input.published,
        featured: input.featured,
        todaysDeal: input.todaysDeal,
      },
    },
  );
  return { ok: true, id: existing.id, slug: existing.slug };
}

export async function deleteAdminProduct(input: {
  id: string;
  actor?: ProductActor;
}): Promise<ProductMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: PRODUCT_DB_REQUIRED };
  }
  const id = input.id.trim();
  if (!id) {
    return { ok: false, formError: "That product no longer exists." };
  }

  const existing = await getPrisma().product.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: {
        select: {
          orderItems: true,
          buildItems: true,
          flashSaleItems: true,
          promotionItems: true,
        },
      },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That product no longer exists." };
  }
  if (existing._count.orderItems > 0) {
    return {
      ok: false,
      formError: "This product is on an order and cannot be deleted.",
    };
  }
  if (existing._count.buildItems > 0) {
    return {
      ok: false,
      formError: "Remove this product from saved PC builds before deleting it.",
    };
  }
  if (
    existing._count.flashSaleItems > 0 ||
    existing._count.promotionItems > 0
  ) {
    return {
      ok: false,
      formError: "Remove this product from campaigns before deleting it.",
    };
  }

  await getPrisma().product.delete({ where: { id: existing.id } });
  await recordProductAudit(
    input.actor,
    AUDIT_ACTIONS.PRODUCT_DELETE,
    existing,
    {},
  );
  return { ok: true, id: existing.id, slug: existing.slug };
}

export { usesCatalogDatabase };
