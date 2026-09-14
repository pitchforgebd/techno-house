/**
 * Session lifecycle limits shared by customer and staff (P11-T03).
 */
import { getPrisma } from "@/lib/db/prisma";

/** Live sessions kept per customer. Oldest extra rows are deleted. */
export const CUSTOMER_MAX_LIVE_SESSIONS = 5;

/** Live sessions kept per staff member. Oldest extra rows are deleted. */
export const STAFF_MAX_LIVE_SESSIONS = 3;

/** Skip lastUsedAt writes more often than this. */
export const SESSION_LAST_USED_TOUCH_MS = 10 * 60 * 1000;

export function shouldTouchLastUsed(
  lastUsedAt: Date,
  now = new Date(),
): boolean {
  return now.getTime() - lastUsedAt.getTime() >= SESSION_LAST_USED_TOUCH_MS;
}

export async function pruneCustomerSessions(userId: string): Promise<void> {
  const prisma = getPrisma();
  const now = new Date();

  await prisma.customerSession.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }],
    },
  });

  const live = await prisma.customerSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const overflow = live.length - CUSTOMER_MAX_LIVE_SESSIONS;
  if (overflow <= 0) {
    return;
  }

  await prisma.customerSession.deleteMany({
    where: { id: { in: live.slice(0, overflow).map((row) => row.id) } },
  });
}

export async function pruneStaffSessions(staffId: string): Promise<void> {
  const prisma = getPrisma();
  const now = new Date();

  await prisma.staffSession.deleteMany({
    where: {
      staffId,
      OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }],
    },
  });

  const live = await prisma.staffSession.findMany({
    where: { staffId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const overflow = live.length - STAFF_MAX_LIVE_SESSIONS;
  if (overflow <= 0) {
    return;
  }

  await prisma.staffSession.deleteMany({
    where: { id: { in: live.slice(0, overflow).map((row) => row.id) } },
  });
}

export async function revokeAllCustomerSessions(userId: string): Promise<void> {
  await getPrisma().customerSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllStaffSessions(staffId: string): Promise<void> {
  await getPrisma().staffSession.updateMany({
    where: { staffId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function touchCustomerSessionLastUsed(id: string): Promise<void> {
  await getPrisma().customerSession.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}

export async function touchStaffSessionLastUsed(id: string): Promise<void> {
  await getPrisma().staffSession.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}
