/**
 * Storefront B2B (wholesale) applications (AD-257).
 *
 * A B2BAccount is an application layered on top of a real, already
 * authenticated customer account — not a separate identity/session
 * system. `userId` is unique, so one customer has at most one account.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { saveB2BDocument } from "@/lib/b2b/document-storage";
import type { B2BStatus } from "@/lib/generated/prisma/enums";

export type MyB2BAccount = {
  status: B2BStatus;
  company: string;
  discountPercent: number;
  tier: string | null;
};

export async function getMyB2BAccount(userId: string): Promise<MyB2BAccount | null> {
  return getPrisma().b2BAccount.findUnique({
    where: { userId },
    select: { status: true, company: true, discountPercent: true, tier: true },
  });
}

export type MyB2BProfile = MyB2BAccount & {
  contactName: string;
  shopAddress: string | null;
  nidNumber: string | null;
  approvedAt: string | null;
};

/** Fuller record for the B2B profile page. */
export async function getMyB2BProfile(
  userId: string,
): Promise<MyB2BProfile | null> {
  const row = await getPrisma().b2BAccount.findUnique({
    where: { userId },
    select: {
      status: true,
      company: true,
      discountPercent: true,
      tier: true,
      contactName: true,
      shopAddress: true,
      nidNumber: true,
      approvedAt: true,
    },
  });
  if (!row) {
    return null;
  }
  return { ...row, approvedAt: row.approvedAt?.toISOString() ?? null };
}

export type UpdateB2BProfileResult =
  | { ok: true }
  | { ok: false; formError: string };

/** Buyer-editable parts of the wholesale profile. Status, tier, discount and
 *  per-product pricing stay admin-only. */
export async function updateMyB2BProfile(input: {
  userId: string;
  company: string;
  contactName: string;
  shopAddress: string;
}): Promise<UpdateB2BProfileResult> {
  const company = input.company.trim().slice(0, 160);
  if (!company) {
    return { ok: false, formError: "Enter your business or shop name." };
  }
  const contactName = input.contactName.trim().slice(0, 120);
  if (!contactName) {
    return { ok: false, formError: "Enter a contact name." };
  }
  const shopAddress = input.shopAddress.trim().slice(0, 300);

  const existing = await getPrisma().b2BAccount.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "No wholesale account found." };
  }

  await getPrisma().b2BAccount.update({
    where: { id: existing.id },
    data: { company, contactName, shopAddress: shopAddress || null },
  });
  return { ok: true };
}

/**
 * Why an existing wholesale account may not re-apply (DSA-10).
 *
 * `SUSPENDED` is not a rejection and it is not a lapsed state — it is written
 * by exactly one code path, `setB2BAccountSuspended` in
 * `lib/admin/b2b-accounts.ts`, which is a staff enforcement action, and the
 * only route back to `ACTIVE` is a staff member un-suspending the account.
 *
 * Re-application used to be allowed from `SUSPENDED`, and it reset the row to
 * `PENDING` with `approvedAt: null`. That let the suspended buyer clear the
 * enforcement action against their own account by filling in the application
 * form again: the account left the "suspended" tab, appeared in the staff
 * review queue as an ordinary new application, and any staff member working
 * that queue would approve it back to `ACTIVE` without ever seeing that it had
 * been suspended. The subject of a penalty decided when the penalty ended.
 *
 * No status may self-apply now, so a wholesale account has exactly one
 * creation event and every state change after it belongs to staff.
 */
function applicationRefusal(status: B2BStatus): string {
  switch (status) {
    case "PENDING":
      return "Your application is already under review.";
    case "ACTIVE":
      return "You already have an active wholesale account.";
    case "SUSPENDED":
      // Deliberately does not invite a re-application: there is nothing the
      // buyer can submit that lifts this, and implying otherwise would send
      // them round a loop that cannot succeed.
      return "Your wholesale account is suspended. Please contact support — it cannot be reopened from here.";
  }
}

export type ApplyForB2BResult = { ok: true } | { ok: false; formError: string };

export async function applyForB2B(input: {
  userId: string;
  company: string;
  contactName: string;
  shopAddress: string;
  tradeLicenceFile: File | null;
  nidFile: File | null;
}): Promise<ApplyForB2BResult> {
  const company = input.company.trim().slice(0, 160);
  if (!company) {
    return { ok: false, formError: "Enter your company / shop name." };
  }
  const contactName = input.contactName.trim().slice(0, 120);
  if (!contactName) {
    return { ok: false, formError: "Enter a contact name." };
  }
  const shopAddress = input.shopAddress.trim().slice(0, 300);
  if (!shopAddress) {
    return { ok: false, formError: "Enter your shop address." };
  }
  if (!input.tradeLicenceFile || input.tradeLicenceFile.size === 0) {
    return { ok: false, formError: "Upload your trade licence." };
  }
  if (!input.nidFile || input.nidFile.size === 0) {
    return { ok: false, formError: "Upload your NID." };
  }

  const prisma = getPrisma();
  const existing = await prisma.b2BAccount.findUnique({
    where: { userId: input.userId },
    select: { id: true, status: true },
  });
  if (existing) {
    return { ok: false, formError: applicationRefusal(existing.status) };
  }

  const licence = await saveB2BDocument(input.tradeLicenceFile);
  if (!licence.ok) {
    return licence;
  }
  const nid = await saveB2BDocument(input.nidFile);
  if (!nid.ok) {
    return nid;
  }

  try {
    await prisma.b2BAccount.create({
      data: {
        userId: input.userId,
        company,
        contactName,
        shopAddress,
        tradeLicenceMedia: licence.document.storageKey,
        nidMedia: nid.document.storageKey,
        status: "PENDING",
      },
    });
  } catch (error) {
    // The check above and this insert are not one transaction, so two
    // submissions racing each other both pass the check. `B2BAccount.userId`
    // is unique, which is what actually enforces "one account per customer" —
    // the loser gets the same answer it would have got a moment later rather
    // than an unhandled error. The constraint is the guard; the check is only
    // there to produce a good message.
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { ok: false, formError: applicationRefusal("PENDING") };
    }
    throw error;
  }

  await writeAuditLog({
    actorType: "CUSTOMER",
    actorId: input.userId,
    action: AUDIT_ACTIONS.B2B_APPLY,
    entityType: "B2BAccount",
    entityId: input.userId,
    metadata: { company },
  });

  return { ok: true };
}
