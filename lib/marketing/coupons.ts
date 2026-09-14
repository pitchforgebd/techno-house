/**
 * Coupon catalogue (P15-T03).
 *
 * Rows live on `Coupon`. Cart apply and order place look up redeemable
 * codes here. Guests and `DATA_SOURCE=mock` keep `lib/cart/coupons`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  MOCK_ADMIN_COUPONS,
  type AdminCoupon,
  type CouponAdminStatus,
} from "@/lib/admin/marketing-mock";
import {
  ADMIN_MARKETING_PAGE_SIZE,
  type CouponListParams,
} from "@/lib/admin/marketing-list-params";
import {
  applyCouponToSubtotal,
  findMockCoupon,
  normalizeCouponCode,
  type CouponDefinition,
} from "@/lib/cart/coupons";
import { CURRENCY_CODE } from "@/lib/format/currency";
import { getPrisma } from "@/lib/db/prisma";
import type { DiscountKind as DbDiscountKind } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

export const COUPONS_DB_REQUIRED =
  "Coupon changes need the database. Turn off DATA_SOURCE=mock to save.";

export type CouponMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type CouponActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type CouponListResult = {
  items: AdminCoupon[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: CouponListParams;
};

export type RedeemableCoupon = CouponDefinition & {
  id: string;
  usageLimit: number | null;
  /** `null` means no per-customer cap — the historical behaviour. */
  perUserLimit: number | null;
};

type CouponClient = Prisma.TransactionClient | ReturnType<typeof getPrisma>;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): CouponMutationResult {
  return { ok: false, formError };
}

function dateLabel(value: Date | null): string {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
}

function parseDateInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const KIND_TO_DB = {
  percent: "PERCENT",
  fixed: "FIXED",
} as const satisfies Record<AdminCoupon["kind"], DbDiscountKind>;

const KIND_FROM_DB: Record<DbDiscountKind, AdminCoupon["kind"]> = {
  PERCENT: "percent",
  FIXED: "fixed",
};

export function deriveCouponStatus(
  isActive: boolean,
  startsAt: Date | null,
  endsAt: Date | null,
  now = new Date(),
): CouponAdminStatus {
  if (!isActive) {
    return "disabled";
  }
  if (startsAt && startsAt > now) {
    return "scheduled";
  }
  if (endsAt && endsAt < now) {
    return "expired";
  }
  return "active";
}

function toAdminCoupon(row: {
  id: string;
  code: string;
  kind: DbDiscountKind;
  value: number;
  label: string | null;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  minSpendAmount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
}): AdminCoupon {
  const startsAt = dateLabel(row.startsAt);
  return {
    id: row.id,
    code: row.code,
    kind: KIND_FROM_DB[row.kind],
    value: row.value,
    label: row.label ?? "",
    status: deriveCouponStatus(row.isActive, row.startsAt, row.endsAt),
    usageCount: row.usageCount,
    usageLimit: row.usageLimit,
    perUserLimit: row.perUserLimit,
    minSpend:
      row.minSpendAmount != null
        ? { amount: row.minSpendAmount, currency: CURRENCY_CODE }
        : null,
    startsAt,
    endsAt: dateLabel(row.endsAt),
    startsAtSort: startsAt,
  };
}

function toDefinition(row: {
  code: string;
  kind: DbDiscountKind;
  value: number;
  label: string | null;
}): CouponDefinition {
  return {
    code: row.code,
    kind: KIND_FROM_DB[row.kind],
    value: row.value,
    label: row.label ?? row.code,
  };
}

function paginateCoupons(
  items: AdminCoupon[],
  params: CouponListParams,
): CouponListResult {
  let filtered = [...items];
  if (params.status !== "all") {
    filtered = filtered.filter((coupon) => coupon.status === params.status);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (coupon) =>
        coupon.code.toLowerCase().includes(q) ||
        coupon.label.toLowerCase().includes(q),
    );
  }
  filtered.sort((a, b) => b.startsAtSort.localeCompare(a.startsAtSort));

  const pageSize = ADMIN_MARKETING_PAGE_SIZE;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

async function recordCouponAudit(
  actor: CouponActor | undefined,
  action: string,
  record: { id: string; code: string },
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
    entityType: "Coupon",
    entityId: record.id,
    metadata,
    ip: actor.ip,
  });
}

const couponSelect = {
  id: true,
  code: true,
  kind: true,
  value: true,
  label: true,
  isActive: true,
  usageCount: true,
  usageLimit: true,
  perUserLimit: true,
  minSpendAmount: true,
  startsAt: true,
  endsAt: true,
} as const;

export async function listAdminCoupons(
  params: CouponListParams,
): Promise<CouponListResult> {
  if (!usesDatabase()) {
    return paginateCoupons([...MOCK_ADMIN_COUPONS], params);
  }
  const rows = await getPrisma().coupon.findMany({
    orderBy: [{ code: "asc" }],
    select: couponSelect,
  });
  return paginateCoupons(rows.map(toAdminCoupon), params);
}

export async function getAdminCoupon(id: string): Promise<AdminCoupon | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  if (!usesDatabase()) {
    return MOCK_ADMIN_COUPONS.find((item) => item.id === trimmed) ?? null;
  }
  const row = await getPrisma().coupon.findUnique({
    where: { id: trimmed },
    select: couponSelect,
  });
  return row ? toAdminCoupon(row) : null;
}

export async function countCoupons(): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_ADMIN_COUPONS.length;
  }
  return getPrisma().coupon.count();
}

export async function countActiveCoupons(): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_ADMIN_COUPONS.filter((item) => item.status === "active").length;
  }
  const now = new Date();
  return getPrisma().coupon.count({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
  });
}

export async function getCouponDefinitionByCode(
  code: string,
): Promise<CouponDefinition | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return null;
  }
  if (!usesDatabase()) {
    return findMockCoupon(normalized);
  }
  const row = await getPrisma().coupon.findUnique({
    where: { code: normalized },
    select: { code: true, kind: true, value: true, label: true },
  });
  return row ? toDefinition(row) : null;
}

function redeemReason(
  row: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    usageCount: number;
    usageLimit: number | null;
    minSpendAmount: number | null;
  },
  subtotal: number,
  now: Date,
): string | null {
  if (!row.isActive) {
    return "That coupon is not available.";
  }
  if (row.startsAt && row.startsAt > now) {
    return "That coupon is not available yet.";
  }
  if (row.endsAt && row.endsAt < now) {
    return "That coupon has expired.";
  }
  if (row.usageLimit != null && row.usageCount >= row.usageLimit) {
    return "That coupon has reached its usage limit.";
  }
  if (row.minSpendAmount != null && subtotal < row.minSpendAmount) {
    return `Spend at least ${row.minSpendAmount} to use this coupon.`;
  }
  return null;
}

export async function findRedeemableCoupon(
  code: string,
  subtotal: number,
  db: CouponClient = getPrisma(),
): Promise<
  { ok: true; coupon: RedeemableCoupon } | { ok: false; reason: string }
> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return { ok: false, reason: "Enter a coupon code." };
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { ok: false, reason: "Add items before applying a coupon." };
  }

  if (!usesDatabase()) {
    const mock = findMockCoupon(normalized);
    if (!mock) {
      return { ok: false, reason: "That coupon code is not recognized." };
    }
    return {
      ok: true,
      coupon: { ...mock, id: mock.code, usageLimit: null, perUserLimit: null },
    };
  }

  const row = await db.coupon.findUnique({
    where: { code: normalized },
    select: {
      id: true,
      code: true,
      kind: true,
      value: true,
      label: true,
      isActive: true,
      usageCount: true,
      usageLimit: true,
      perUserLimit: true,
      minSpendAmount: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!row) {
    return { ok: false, reason: "That coupon code is not recognized." };
  }
  const blocked = redeemReason(row, subtotal, new Date());
  if (blocked) {
    return { ok: false, reason: blocked };
  }
  return {
    ok: true,
    coupon: {
      id: row.id,
      usageLimit: row.usageLimit,
      perUserLimit: row.perUserLimit,
      ...toDefinition(row),
    },
  };
}

export async function applyRedeemableCoupon(
  code: string,
  subtotal: number,
  db: CouponClient = getPrisma(),
): Promise<ReturnType<typeof applyCouponToSubtotal> & { couponId?: string }> {
  const found = await findRedeemableCoupon(code, subtotal, db);
  if (!found.ok) {
    return found;
  }
  const applied = applyCouponToSubtotal(
    found.coupon.code,
    subtotal,
    found.coupon,
  );
  if (!applied.ok) {
    return applied;
  }
  return { ...applied, couponId: found.coupon.id };
}

/**
 * Refuses when this customer has already reached their cap for this coupon.
 *
 * `Coupon.usageCount` alone cannot answer "has THIS customer used it before?",
 * which is why a redemption ledger exists (DSA-14).
 *
 * **Takes a row lock on the coupon first**, deliberately. Counting and then
 * inserting is a read-then-act: without the lock, two concurrent checkouts by
 * the same customer both count the same total, both pass, and the cap is
 * exceeded — the same shape as the refund and wallet races found elsewhere in
 * this codebase. The lock is held until the transaction commits, so the count
 * cannot move between this check and the insert that follows order creation.
 * Redemptions of one coupon serialise as a result, which is the intended cost.
 *
 * `perUserLimit: null` short-circuits before taking the lock, so a coupon
 * configured the way every existing coupon is configured behaves exactly as it
 * did before and pays nothing for this.
 */
export async function checkCouponPerUserLimit(
  db: CouponClient,
  coupon: RedeemableCoupon,
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!usesDatabase() || coupon.perUserLimit == null) {
    return { ok: true };
  }

  await db.$queryRaw`SELECT id FROM "Coupon" WHERE id = ${coupon.id} FOR UPDATE`;

  const used = await db.couponRedemption.count({
    where: { couponId: coupon.id, userId },
  });
  if (used >= coupon.perUserLimit) {
    return {
      ok: false,
      reason:
        coupon.perUserLimit === 1
          ? "You have already used this coupon."
          : `You have already used this coupon ${coupon.perUserLimit} times.`,
    };
  }
  return { ok: true };
}

/**
 * Writes the redemption row. Called after the order exists, inside the same
 * transaction as `checkCouponPerUserLimit`, so the coupon row is still locked.
 */
export async function recordCouponRedemption(
  db: CouponClient,
  couponId: string,
  input: { userId: string; orderId: string },
): Promise<void> {
  if (!usesDatabase()) {
    return;
  }
  await db.couponRedemption.create({
    data: { couponId, userId: input.userId, orderId: input.orderId },
  });
}

export async function incrementCouponUsage(
  db: CouponClient,
  coupon: RedeemableCoupon,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!usesDatabase()) {
    return { ok: true };
  }
  const updated = await db.coupon.updateMany({
    where: {
      id: coupon.id,
      isActive: true,
      ...(coupon.usageLimit != null
        ? { usageCount: { lt: coupon.usageLimit } }
        : {}),
    },
    data: { usageCount: { increment: 1 } },
  });
  if (updated.count === 0) {
    return { ok: false, reason: "That coupon has reached its usage limit." };
  }
  return { ok: true };
}

export async function saveCoupon(input: {
  id?: string;
  code: string;
  kind: string;
  value: string;
  label: string;
  status: string;
  usageLimit: string;
  perUserLimit: string;
  minSpend: string;
  startsAt: string;
  endsAt: string;
  actor?: CouponActor;
}): Promise<CouponMutationResult> {
  if (!usesDatabase()) {
    return fail(COUPONS_DB_REQUIRED);
  }

  const code = normalizeCouponCode(input.code);
  if (!code) {
    return fail("Enter a coupon code.");
  }
  if (!(input.kind in KIND_TO_DB)) {
    return fail("Choose a valid discount kind.");
  }
  const kind = input.kind as AdminCoupon["kind"];
  const value = Number.parseInt(input.value, 10);
  if (!Number.isFinite(value) || value < 1) {
    return fail("Enter a discount value of 1 or more.");
  }
  if (kind === "percent" && value > 100) {
    return fail("Percent discounts cannot exceed 100.");
  }

  const label = input.label.trim().slice(0, 80);
  if (!label) {
    return fail("Enter a coupon label.");
  }

  const status = input.status.trim();
  if (
    status !== "active" &&
    status !== "scheduled" &&
    status !== "disabled" &&
    status !== "expired"
  ) {
    return fail("Choose a valid status.");
  }
  const isActive = status !== "disabled";

  const startsAt = parseDateInput(input.startsAt);
  const endsAt = parseDateInput(input.endsAt);
  if (input.startsAt.trim() && !startsAt) {
    return fail("Enter a valid start date.");
  }
  if (input.endsAt.trim() && !endsAt) {
    return fail("Enter a valid end date.");
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return fail("The end date must be on or after the start date.");
  }

  let usageLimit: number | null = null;
  if (input.usageLimit.trim()) {
    const parsed = Number.parseInt(input.usageLimit, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fail("Usage limit must be 1 or more.");
    }
    usageLimit = parsed;
  }

  let perUserLimit: number | null = null;
  if (input.perUserLimit.trim()) {
    const parsed = Number.parseInt(input.perUserLimit, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fail("Per-customer limit must be 1 or more, or left blank.");
    }
    perUserLimit = parsed;
  }

  let minSpendAmount: number | null = null;
  if (input.minSpend.trim()) {
    const parsed = Number.parseInt(input.minSpend, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return fail("Minimum spend must be 1 or more.");
    }
    minSpendAmount = parsed;
  }

  const existingId = input.id?.trim() ?? "";
  const codeTaken = await getPrisma().coupon.findFirst({
    where: {
      code,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
    select: { id: true },
  });
  if (codeTaken) {
    return fail("That coupon code is already in use.");
  }

  const data = {
    code,
    kind: KIND_TO_DB[kind],
    value,
    label,
    isActive,
    usageLimit,
    perUserLimit,
    minSpendAmount,
    startsAt,
    endsAt,
  };

  if (existingId) {
    const existing = await getPrisma().coupon.findUnique({
      where: { id: existingId },
      select: { id: true, code: true },
    });
    if (!existing) {
      return fail("That coupon no longer exists.");
    }
    await getPrisma().coupon.update({
      where: { id: existing.id },
      data,
    });
    await recordCouponAudit(
      input.actor,
      AUDIT_ACTIONS.COUPON_UPDATE,
      existing,
      { code, kind, isActive },
    );
    return { ok: true, id: existing.id };
  }

  const created = await getPrisma().coupon.create({ data });
  await recordCouponAudit(input.actor, AUDIT_ACTIONS.COUPON_CREATE, created, {
    code,
    kind,
    isActive,
  });
  return { ok: true, id: created.id };
}
