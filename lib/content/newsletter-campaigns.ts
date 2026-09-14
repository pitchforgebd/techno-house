/**
 * Real newsletter campaign sending (Admin → Newsletter, AD-261). Sends to
 * real SUBSCRIBED rows via the existing SMTP sender (lib/mail/send.ts).
 * `sentCount`/`failedCount` are the real, measured per-recipient outcome —
 * never assumed successful. Sequential sends (not batched/parallel) to
 * stay gentle on the configured SMTP server.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { sendMail } from "@/lib/mail/send";
import type { NewsletterCampaignStatus as DbStatus } from "@/lib/generated/prisma/enums";

export type NewsletterCampaignStatus = "draft" | "sending" | "sent" | "failed";

export type AdminNewsletterCampaign = {
  id: string;
  subject: string;
  body: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
};

function toStatus(value: DbStatus): NewsletterCampaignStatus {
  return value.toLowerCase() as NewsletterCampaignStatus;
}

export async function listAdminCampaigns(): Promise<AdminNewsletterCampaign[]> {
  const rows = await getPrisma().newsletterCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    body: row.body,
    status: toStatus(row.status),
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    lastError: row.lastError,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type SendCampaignResult =
  | { ok: true; recipientCount: number; sentCount: number; failedCount: number }
  | { ok: false; formError: string };

export async function createAndSendCampaign(input: {
  subject: string;
  body: string;
  actor: { staffId: string; email: string; ip?: string | null };
}): Promise<SendCampaignResult> {
  const subject = input.subject.trim().slice(0, 200);
  if (!subject) {
    return { ok: false, formError: "Enter a subject." };
  }
  const body = input.body.trim().slice(0, 10000);
  if (!body) {
    return { ok: false, formError: "Enter the campaign body." };
  }

  const prisma = getPrisma();
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "SUBSCRIBED" },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return { ok: false, formError: "There are no subscribed recipients to send to." };
  }

  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject,
      body,
      status: "SENDING",
      recipientCount: subscribers.length,
    },
    select: { id: true },
  });

  let sentCount = 0;
  let failedCount = 0;
  let lastError: string | null = null;

  for (const subscriber of subscribers) {
    const result = await sendMail({ to: subscriber.email, subject, text: body });
    if (result.ok) {
      sentCount += 1;
    } else {
      failedCount += 1;
      lastError = result.formError;
    }
  }

  const finalStatus: DbStatus = sentCount > 0 ? "SENT" : "FAILED";

  await prisma.newsletterCampaign.update({
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
    action: AUDIT_ACTIONS.NEWSLETTER_CAMPAIGN_SEND,
    entityType: "NewsletterCampaign",
    entityId: campaign.id,
    ip: input.actor.ip,
    metadata: {
      subject,
      recipientCount: subscribers.length,
      sentCount,
      failedCount,
    },
  });

  return {
    ok: true,
    recipientCount: subscribers.length,
    sentCount,
    failedCount,
  };
}
