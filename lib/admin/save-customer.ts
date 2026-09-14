/**
 * Real customer account create/update from Admin → Customers (AD-256).
 * Passwords are Argon2id-hashed before storage, same helper customer login
 * already verifies against.
 */
import {
  isValidEmail,
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
  validatePassword,
} from "@/lib/account/validation";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { hashPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/db/prisma";
import type { UserStatus as DbUserStatus } from "@/lib/generated/prisma/enums";
import type { CustomerStatus } from "@/lib/admin/customers-mock";

export type SaveCustomerResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

type Actor = { staffId: string; email: string; ip?: string | null };

const STATUS_TO_DB: Record<CustomerStatus, DbUserStatus> = {
  active: "ACTIVE",
  invited: "INVITED",
  blocked: "BLOCKED",
};

function isUniqueConflict(error: unknown): string | null {
  if (
    !error ||
    typeof error !== "object" ||
    !("code" in error) ||
    error.code !== "P2002"
  ) {
    return null;
  }
  const meta = "meta" in error ? (error.meta as { target?: string[] }) : null;
  const target = meta?.target?.join(",") ?? "";
  if (target.includes("phone")) {
    return "That phone number is already used by another customer.";
  }
  return "That email is already used by another customer.";
}

export async function createCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  actor: Actor;
}): Promise<SaveCustomerResult> {
  const fullName = normalizeFullName(input.fullName);
  if (!fullName) {
    return { ok: false, formError: "Enter a customer name." };
  }
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, formError: "Enter a valid email." };
  }
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { ok: false, formError: "Enter a phone number." };
  }
  const passwordError = validatePassword(input.password);
  if (passwordError) {
    return { ok: false, formError: passwordError };
  }

  const passwordHash = await hashPassword(input.password);
  const prisma = getPrisma();

  try {
    const created = await prisma.user.create({
      data: { fullName, email, phone, passwordHash, status: "ACTIVE" },
      select: { id: true },
    });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CUSTOMER_CREATE,
      entityType: "User",
      entityId: created.id,
      ip: input.actor.ip,
      metadata: { email },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    const conflict = isUniqueConflict(error);
    if (conflict) {
      return { ok: false, formError: conflict };
    }
    throw error;
  }
}

export async function updateCustomerProfile(input: {
  id: string;
  status: CustomerStatus;
  notes: string;
  actor: Actor;
}): Promise<SaveCustomerResult> {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That customer no longer exists." };
  }

  const notes = input.notes.trim().slice(0, 2000) || null;

  await prisma.user.update({
    where: { id: existing.id },
    data: { status: STATUS_TO_DB[input.status], notes },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.CUSTOMER_UPDATE,
    entityType: "User",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { status: input.status },
  });

  return { ok: true, id: existing.id };
}

export async function setCustomerBanned(input: {
  id: string;
  banned: boolean;
  actor: Actor;
}): Promise<SaveCustomerResult> {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That customer no longer exists." };
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { status: input.banned ? "BLOCKED" : "ACTIVE" },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: input.banned ? AUDIT_ACTIONS.CUSTOMER_BAN : AUDIT_ACTIONS.CUSTOMER_UNBAN,
    entityType: "User",
    entityId: existing.id,
    ip: input.actor.ip,
  });

  return { ok: true, id: existing.id };
}

export async function bulkSetCustomerBanned(input: {
  ids: string[];
  banned: boolean;
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const prisma = getPrisma();
  const result = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { status: input.banned ? "BLOCKED" : "ACTIVE" },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: input.banned ? AUDIT_ACTIONS.CUSTOMER_BAN : AUDIT_ACTIONS.CUSTOMER_UNBAN,
    entityType: "User",
    ip: input.actor.ip,
    metadata: { bulk: true, ids, count: result.count },
  });

  return { ok: true, count: result.count };
}

export async function setCustomerSuspicious(input: {
  id: string;
  suspicious: boolean;
  actor: Actor;
}): Promise<SaveCustomerResult> {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That customer no longer exists." };
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { isSuspicious: input.suspicious },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.CUSTOMER_UPDATE,
    entityType: "User",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { suspicious: input.suspicious },
  });

  return { ok: true, id: existing.id };
}

export async function bulkSetCustomerSuspicious(input: {
  ids: string[];
  suspicious: boolean;
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const prisma = getPrisma();
  const result = await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { isSuspicious: input.suspicious },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.CUSTOMER_UPDATE,
    entityType: "User",
    ip: input.actor.ip,
    metadata: { bulk: true, suspicious: input.suspicious, ids, count: result.count },
  });

  return { ok: true, count: result.count };
}

export async function adjustCustomerWallet(input: {
  id: string;
  amount: number;
  reason?: string;
  actor: Actor;
}): Promise<SaveCustomerResult & { balance?: number }> {
  if (!Number.isFinite(input.amount) || !Number.isInteger(input.amount) || input.amount === 0) {
    return { ok: false, formError: "Enter a non-zero whole amount." };
  }
  if (Math.abs(input.amount) > 10_000_000) {
    return { ok: false, formError: "That amount is too large." };
  }
  const reason = input.reason?.trim().slice(0, 200) || null;

  const prisma = getPrisma();

  const result: SaveCustomerResult & { balance?: number } =
    await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: input.id },
      select: { id: true, walletAmount: true },
    });
    if (!existing) {
      return { ok: false, formError: "That customer no longer exists." };
    }

    // Atomic, guarded adjustment (DSA-06).
    //
    // This used to read the balance, add the delta in JavaScript and write the
    // absolute result. `$transaction` gives atomicity but not isolation: under
    // Postgres READ COMMITTED two concurrent adjustments both read the same
    // balance and both wrote the same total, so one was silently lost and
    // `WalletTransaction` no longer summed to `User.walletAmount` — the worst
    // outcome for a money balance, because afterwards neither source can be
    // trusted over the other.
    //
    // The `gte` guard makes the floor part of the same statement rather than a
    // separate check, so a debit cannot overdraw even if another debit lands
    // between the read above and this write. It is correct for credits too: a
    // positive amount makes the bound negative, which any non-negative balance
    // satisfies.
    const applied = await tx.user.updateMany({
      where: { id: existing.id, walletAmount: { gte: -input.amount } },
      data: { walletAmount: { increment: input.amount } },
    });
    if (applied.count !== 1) {
      return {
        ok: false,
        formError: `Cannot deduct more than the current balance (${existing.walletAmount}).`,
      };
    }

    // Read back inside the transaction. Our own UPDATE holds the row lock until
    // commit, so this is the balance this adjustment actually produced — the
    // ledger can never record a total that the row does not hold.
    const settled = await tx.user.findUnique({
      where: { id: existing.id },
      select: { walletAmount: true },
    });
    const nextBalance = settled?.walletAmount ?? existing.walletAmount + input.amount;

    await tx.walletTransaction.create({
      data: {
        userId: existing.id,
        amount: input.amount,
        balanceAfter: nextBalance,
        reason,
        createdById: input.actor.staffId,
        createdByName: input.actor.email,
      },
    });

    return { ok: true, id: existing.id, balance: nextBalance };
  });

  // Audit outside the transaction, deliberately.
  //
  // `writeAuditLog` uses the pooled global client, not `tx`. Called from
  // inside an interactive transaction it asks the pool for a SECOND
  // connection while still holding the first — so with `max: 5`, five
  // concurrent adjustments held every connection and then all waited for one
  // that could not come free. The result was a pool deadlock that surfaced as
  // P2028 transaction timeouts, not as anything obviously wallet-shaped. The
  // audit log is explicitly non-blocking by design ("a failed write must not
  // block the action that produced it"), so it belongs after the commit.
  if (result.ok) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CUSTOMER_WALLET_ADJUST,
      entityType: "User",
      entityId: result.id,
      ip: input.actor.ip,
      metadata: {
        amount: input.amount,
        balanceAfter: result.balance,
        reason,
      },
    });
  }

  return result;
}
