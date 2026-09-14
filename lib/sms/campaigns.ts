/**
 * Real bulk SMS campaigns (Admin → Marketing → Bulk SMS, AD-266). Sends
 * to real customers with a phone number via the existing single-SMS
 * sender (lib/sms/send.ts) — one real HTTP call per recipient, using
 * whatever provider is configured in Admin → OTP. Sequential, not
 * parallel, to stay gentle on the provider and avoid rate-limit flags.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { sendSms } from "@/lib/sms/send";
import type { SmsCampaignStatus as DbStatus } from "@/lib/generated/prisma/enums";

export type SmsAudience = "all" | "verified" | "recent";
export type SmsCampaignStatusView = "draft" | "sending" | "sent" | "failed";

export type AdminSmsCampaign = {
  id: string;
  message: string;
  audience: SmsAudience;
  status: SmsCampaignStatusView;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
};

function toAudience(value: string): SmsAudience {
  return value === "verified" || value === "recent" ? value : "all";
}

function toStatus(value: DbStatus): SmsCampaignStatusView {
  return value.toLowerCase() as SmsCampaignStatusView;
}

export async function listAdminSmsCampaigns(): Promise<AdminSmsCampaign[]> {
  const rows = await getPrisma().smsCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    audience: toAudience(row.audience),
    status: toStatus(row.status),
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    lastError: row.lastError,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

function audienceWhere(audience: SmsAudience) {
  const base = { status: "ACTIVE" as const, phone: { not: null } };
  if (audience === "verified") {
    return { ...base, phoneVerifiedAt: { not: null } };
  }
  if (audience === "recent") {
    return { ...base, orders: { some: {} } };
  }
  return base;
}

export type SendCampaignResult =
  | { ok: true; recipientCount: number; sentCount: number; failedCount: number }
  | { ok: false; formError: string };

export async function createAndSendSmsCampaign(input: {
  message: string;
  audience: SmsAudience;
  actor: { staffId: string; email: string; ip?: string | null };
}): Promise<SendCampaignResult> {
  const message = input.message.trim().slice(0, 480);
  if (!message) {
    return { ok: false, formError: "Enter the SMS message." };
  }

  const prisma = getPrisma();
  const recipients = await prisma.user.findMany({
    where: audienceWhere(input.audience),
    select: { phone: true },
  });
  const phones = recipients
    .map((row) => row.phone)
    .filter((phone): phone is string => Boolean(phone));

  if (phones.length === 0) {
    return { ok: false, formError: "No customers with a phone number match that audience." };
  }

  const campaign = await prisma.smsCampaign.create({
    data: {
      message,
      audience: input.audience,
      status: "SENDING",
      recipientCount: phones.length,
    },
    select: { id: true },
  });

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  for (const phone of phones) {
    const result = await sendSms({ to: phone, message });
    if (result.ok) {
      sentCount += 1;
    } else {
      failedCount += 1;
      lastError = result.formError;
    }
  }

  const finalStatus: DbStatus = sentCount > 0 ? "SENT" : "FAILED";

  await prisma.smsCampaign.update({
    where: { id: campaign.id },
    data: {
      status: finalStatus,
      sentCount,
      failedCount,
      lastError,
      sentAt: new Date(),
    },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.SMS_CAMPAIGN_SEND,
    entityType: "SmsCampaign",
    entityId: campaign.id,
    ip: input.actor.ip,
    metadata: {
      audience: input.audience,
      recipientCount: phones.length,
      sentCount,
      failedCount,
    },
  });

  return {
    ok: true,
    recipientCount: phones.length,
    sentCount,
    failedCount,
  };
}
