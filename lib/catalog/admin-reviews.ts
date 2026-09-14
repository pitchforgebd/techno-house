/**
 * Admin review persistence (P12-T06).
 *
 * Storefront reads stay on ReviewRepository (published rows only). These
 * helpers include pending and rejected reviews and write to PostgreSQL.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  parseStaffReviewInput,
  type AdminReviewStatus,
  type StaffReviewInputFields,
} from "@/lib/catalog/review-input";
import { getPrisma } from "@/lib/db/prisma";
import type { ModerationStatus } from "@/lib/generated/prisma/enums";

export const REVIEW_DB_REQUIRED =
  "Review changes need the database. Turn off DATA_SOURCE=mock to save.";

export type ReviewMutationResult =
  | { ok: true; id: string; productSlug: string }
  | { ok: false; formError: string };

export type ReviewActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type AdminReviewSummary = {
  productId: string;
  productSlug: string;
  productName: string;
  imageSrc: string;
  categorySlug: string;
  brandName: string;
  avgRating: number;
  reviewCount: number;
  customReviewCount: number;
  pendingCount: number;
};

export type AdminReviewRecord = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  status: AdminReviewStatus;
  isStaffEntry: boolean;
  createdAt: string;
};

const PLACEHOLDER_IMAGE_SRC = "/products/placeholder.svg";

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function toAdminStatus(status: ModerationStatus): AdminReviewStatus {
  if (status === "PUBLISHED") {
    return "published";
  }
  if (status === "REJECTED") {
    return "rejected";
  }
  return "pending";
}

function toDbStatus(status: AdminReviewStatus): ModerationStatus {
  if (status === "published") {
    return "PUBLISHED";
  }
  if (status === "rejected") {
    return "REJECTED";
  }
  return "PENDING";
}

async function recordReviewAudit(
  actor: ReviewActor | undefined,
  action: string,
  record: { id: string; productSlug: string },
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
    entityType: "ProductReview",
    entityId: record.id,
    ip: actor.ip,
    metadata: { productSlug: record.productSlug, ...metadata },
  });
}

export async function listAdminReviewSummaries(): Promise<
  AdminReviewSummary[]
> {
  const prisma = getPrisma();
  const [products, published, staff, pending] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        category: { select: { slug: true } },
        brand: { select: { name: true } },
        images: {
          select: { src: true },
          orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
          take: 1,
        },
      },
    }),
    prisma.productReview.groupBy({
      by: ["productId"],
      where: { status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.productReview.groupBy({
      by: ["productId"],
      where: { isStaffEntry: true },
      _count: { _all: true },
    }),
    prisma.productReview.groupBy({
      by: ["productId"],
      where: { status: "PENDING" },
      _count: { _all: true },
    }),
  ]);

  const publishedByProduct = new Map(
    published.map((row) => [
      row.productId,
      {
        avg: row._avg.rating ?? 0,
        count: row._count._all,
      },
    ]),
  );
  const staffByProduct = new Map(
    staff.map((row) => [row.productId, row._count._all]),
  );
  const pendingByProduct = new Map(
    pending.map((row) => [row.productId, row._count._all]),
  );

  return products.map((product) => {
    const publishedRow = publishedByProduct.get(product.id);
    const avgRating = publishedRow ? Math.round(publishedRow.avg * 10) / 10 : 0;
    return {
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      imageSrc: product.images[0]?.src ?? PLACEHOLDER_IMAGE_SRC,
      categorySlug: product.category.slug,
      brandName: product.brand.name,
      avgRating,
      reviewCount: publishedRow?.count ?? 0,
      customReviewCount: staffByProduct.get(product.id) ?? 0,
      pendingCount: pendingByProduct.get(product.id) ?? 0,
    };
  });
}

export async function listAdminReviewsForProduct(
  slug: string,
): Promise<{
  productName: string;
  productSlug: string;
  items: AdminReviewRecord[];
} | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  const product = await getPrisma().product.findUnique({
    where: { slug: trimmed },
    select: { id: true, slug: true, name: true },
  });
  if (!product) {
    return null;
  }

  const rows = await getPrisma().productReview.findMany({
    where: { productId: product.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      productId: true,
      authorName: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      isStaffEntry: true,
      createdAt: true,
    },
  });

  return {
    productName: product.name,
    productSlug: product.slug,
    items: rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productSlug: product.slug,
      productName: product.name,
      authorName: row.authorName,
      rating: row.rating,
      title: row.title ?? "",
      body: row.body,
      status: toAdminStatus(row.status),
      isStaffEntry: row.isStaffEntry,
      createdAt: row.createdAt.toISOString().slice(0, 10),
    })),
  };
}

export async function createAdminCustomReview(input: {
  fields: StaffReviewInputFields;
  actor?: ReviewActor;
}): Promise<ReviewMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: REVIEW_DB_REQUIRED };
  }
  const parsed = parseStaffReviewInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }

  const product = await getPrisma().product.findUnique({
    where: { id: parsed.value.productId },
    select: { id: true, slug: true, name: true },
  });
  if (!product) {
    return { ok: false, formError: "That product no longer exists." };
  }

  const created = await getPrisma().productReview.create({
    data: {
      productId: product.id,
      authorName: parsed.value.reviewerName,
      rating: parsed.value.rating,
      title: parsed.value.title,
      body: parsed.value.body,
      status: "PUBLISHED",
      isStaffEntry: true,
      createdAt: parsed.value.createdAt ?? undefined,
    },
    select: { id: true },
  });

  await recordReviewAudit(
    input.actor,
    AUDIT_ACTIONS.REVIEW_CREATE,
    { id: created.id, productSlug: product.slug },
    {
      productName: product.name,
      isStaffEntry: true,
      status: "published",
    },
  );

  return { ok: true, id: created.id, productSlug: product.slug };
}

export async function moderateAdminReview(input: {
  id: string;
  status: AdminReviewStatus;
  actor?: ReviewActor;
}): Promise<ReviewMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: REVIEW_DB_REQUIRED };
  }
  if (input.status === "pending") {
    return { ok: false, formError: "Choose publish or reject." };
  }

  const existing = await getPrisma().productReview.findUnique({
    where: { id: input.id.trim() },
    select: {
      id: true,
      status: true,
      product: { select: { slug: true, name: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That review no longer exists." };
  }

  await getPrisma().productReview.update({
    where: { id: existing.id },
    data: { status: toDbStatus(input.status) },
  });

  await recordReviewAudit(
    input.actor,
    AUDIT_ACTIONS.REVIEW_MODERATE,
    { id: existing.id, productSlug: existing.product.slug },
    {
      productName: existing.product.name,
      from: toAdminStatus(existing.status),
      to: input.status,
    },
  );

  return {
    ok: true,
    id: existing.id,
    productSlug: existing.product.slug,
  };
}

export async function deleteAdminReview(input: {
  id: string;
  actor?: ReviewActor;
}): Promise<ReviewMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: REVIEW_DB_REQUIRED };
  }

  const existing = await getPrisma().productReview.findUnique({
    where: { id: input.id.trim() },
    select: {
      id: true,
      product: { select: { slug: true, name: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That review no longer exists." };
  }

  await getPrisma().productReview.delete({ where: { id: existing.id } });
  await recordReviewAudit(
    input.actor,
    AUDIT_ACTIONS.REVIEW_DELETE,
    { id: existing.id, productSlug: existing.product.slug },
    { productName: existing.product.name },
  );
  return {
    ok: true,
    id: existing.id,
    productSlug: existing.product.slug,
  };
}

export async function deleteAdminReviewsForProduct(input: {
  productSlug: string;
  actor?: ReviewActor;
}): Promise<ReviewMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: REVIEW_DB_REQUIRED };
  }

  const product = await getPrisma().product.findUnique({
    where: { slug: input.productSlug.trim() },
    select: { id: true, slug: true, name: true },
  });
  if (!product) {
    return { ok: false, formError: "That product no longer exists." };
  }

  const deleted = await getPrisma().productReview.deleteMany({
    where: { productId: product.id },
  });
  await recordReviewAudit(
    input.actor,
    AUDIT_ACTIONS.REVIEW_DELETE,
    { id: product.id, productSlug: product.slug },
    { productName: product.name, deletedCount: deleted.count },
  );
  return { ok: true, id: product.id, productSlug: product.slug };
}

export { usesCatalogDatabase };
