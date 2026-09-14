/**
 * Category discounts (`/admin/promotions/category-discounts`) — Phase 2.
 *
 * The `CategoryDiscount` model already existed but nothing read or wrote it —
 * the admin table hardcoded `discountPercent: 0` / `"Select Date"` and every
 * edit was a toast. This wires the existing model up for real.
 *
 * `CategoryDiscount.categoryId` is `@unique`, so one row per category is the
 * schema's own conflict rule — overlapping discounts are impossible by
 * construction and no extra overlap check is needed.
 *
 * Merchandising only: no storefront pricing path reads this yet (see
 * TASK_STATE.md), so saving a discount does not change what a customer pays.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export const CATEGORY_DISCOUNT_DB_REQUIRED =
  "Category discounts need the database. Turn off DATA_SOURCE=mock to save.";

export type CategoryDiscountMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type CategoryDiscountActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type CategoryDiscountValue = {
  discountPercent: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): CategoryDiscountMutationResult {
  return { ok: false, formError };
}

/** Real stored discounts keyed by category slug, for the admin table. */
export async function getCategoryDiscountsBySlug(): Promise<
  Map<string, CategoryDiscountValue>
> {
  if (!usesDatabase()) {
    return new Map();
  }
  const rows = await getPrisma().categoryDiscount.findMany({
    where: { isActive: true },
    select: {
      discountPercent: true,
      startsAt: true,
      endsAt: true,
      category: { select: { slug: true } },
    },
  });
  return new Map(
    rows.map((row) => [
      row.category.slug,
      {
        discountPercent: row.discountPercent,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      },
    ]),
  );
}

/** `null` = not provided; `undefined` return = invalid. */
function parseDate(raw: string | null | undefined): Date | null | undefined {
  if (raw == null || raw.trim() === "") {
    return null;
  }
  const value = new Date(raw);
  if (Number.isNaN(value.getTime())) {
    return undefined;
  }
  return value;
}

export async function saveCategoryDiscount(input: {
  categorySlug: string;
  discountPercent: string | number;
  startsAt?: string | null;
  endsAt?: string | null;
  actor?: CategoryDiscountActor;
}): Promise<CategoryDiscountMutationResult> {
  if (!usesDatabase()) {
    return fail(CATEGORY_DISCOUNT_DB_REQUIRED);
  }

  const slug = input.categorySlug.trim();
  if (!slug) {
    return fail("Choose a category.");
  }

  const percentRaw =
    typeof input.discountPercent === "number"
      ? input.discountPercent
      : Number(input.discountPercent.trim());
  if (
    !Number.isFinite(percentRaw) ||
    !Number.isInteger(percentRaw) ||
    percentRaw < 0 ||
    percentRaw > 100
  ) {
    return fail("Discount must be a whole number between 0 and 100.");
  }

  const startsAt = parseDate(input.startsAt);
  if (startsAt === undefined) {
    return fail("Enter a valid start date, or leave it blank.");
  }
  const endsAt = parseDate(input.endsAt);
  if (endsAt === undefined) {
    return fail("Enter a valid end date, or leave it blank.");
  }
  if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
    return fail("End date must be on or after the start date.");
  }

  const category = await getPrisma().category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!category) {
    return fail("That category no longer exists.");
  }

  await getPrisma().categoryDiscount.upsert({
    where: { categoryId: category.id },
    create: {
      categoryId: category.id,
      discountPercent: percentRaw,
      startsAt,
      endsAt,
      isActive: true,
    },
    update: {
      discountPercent: percentRaw,
      startsAt,
      endsAt,
      isActive: true,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CATEGORY_DISCOUNT_UPDATE,
      entityType: "CategoryDiscount",
      entityId: category.id,
      ip: input.actor.ip,
      metadata: { slug, discountPercent: percentRaw },
    });
  }

  return { ok: true };
}
