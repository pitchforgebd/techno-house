/**
 * Email template content (Admin → Marketing → Email Templates, AD-261).
 * Real CRUD for the fixed catalogue of transactional email types — not
 * yet wired to real order-lifecycle send triggers (no code creates an
 * email keyed to one of these today; that is a separate, larger task,
 * same disclosed gap as NotificationTypeSetting). "Send test email" is
 * real and uses the existing SMTP sender.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { sendMail, type SendMailResult } from "@/lib/mail/send";
import type { EmailTemplateAudience as DbAudience } from "@/lib/generated/prisma/enums";

export type EmailTemplateAudience = "all" | "admin" | "customer" | "common";

export type AdminEmailTemplate = {
  id: string;
  key: string;
  emailType: string;
  subject: string;
  body: string;
  audience: EmailTemplateAudience;
  enabled: boolean;
  isLocked: boolean;
};

type Actor = { staffId: string; email: string; ip?: string | null };

function toAudience(value: DbAudience): EmailTemplateAudience {
  return value.toLowerCase() as EmailTemplateAudience;
}

const templateSelect = {
  id: true,
  key: true,
  emailType: true,
  subject: true,
  body: true,
  audience: true,
  enabled: true,
  isLocked: true,
} as const;

function toAdminTemplate(row: {
  id: string;
  key: string;
  emailType: string;
  subject: string;
  body: string;
  audience: DbAudience;
  enabled: boolean;
  isLocked: boolean;
}): AdminEmailTemplate {
  return { ...row, audience: toAudience(row.audience) };
}

export async function listAdminEmailTemplates(): Promise<AdminEmailTemplate[]> {
  const rows = await getPrisma().emailTemplate.findMany({
    orderBy: [{ position: "asc" }, { emailType: "asc" }],
    select: templateSelect,
  });
  return rows.map(toAdminTemplate);
}

export async function getAdminEmailTemplate(id: string): Promise<AdminEmailTemplate | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().emailTemplate.findUnique({
    where: { id: trimmed },
    select: templateSelect,
  });
  return row ? toAdminTemplate(row) : null;
}

export type SaveResult = { ok: true } | { ok: false; formError: string };

export async function saveEmailTemplate(input: {
  id: string;
  subject: string;
  body: string;
  actor: Actor;
}): Promise<SaveResult> {
  const subject = input.subject.trim().slice(0, 200);
  if (!subject) {
    return { ok: false, formError: "Enter a subject." };
  }
  const body = input.body.trim().slice(0, 5000);
  if (!body) {
    return { ok: false, formError: "Enter the email body." };
  }

  const existing = await getPrisma().emailTemplate.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That email template no longer exists." };
  }

  await getPrisma().emailTemplate.update({
    where: { id: existing.id },
    data: { subject, body },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.EMAIL_TEMPLATE_UPDATE,
    entityType: "EmailTemplate",
    entityId: existing.id,
    ip: input.actor.ip,
  });

  return { ok: true };
}

export async function setEmailTemplateEnabled(input: {
  id: string;
  enabled: boolean;
  actor: Actor;
}): Promise<SaveResult> {
  const existing = await getPrisma().emailTemplate.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That email template no longer exists." };
  }
  await getPrisma().emailTemplate.update({
    where: { id: existing.id },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.EMAIL_TEMPLATE_UPDATE,
    entityType: "EmailTemplate",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { enabled: input.enabled },
  });
  return { ok: true };
}

const SAMPLE_PLACEHOLDER_VALUES: Record<string, string> = {
  customer_name: "Jamal Uddin",
  order_code: "TH-1024",
  tracking_code: "SF-88213456",
  store_name: "Techno House",
  product_name: "Sample Product",
};

export function substitutePlaceholders(text: string): string {
  return text.replace(/\[\[(\w+)\]\]/g, (match, key: string) => {
    return SAMPLE_PLACEHOLDER_VALUES[key] ?? match;
  });
}

export async function sendTestEmailTemplate(input: {
  id: string;
  to: string;
}): Promise<SendMailResult> {
  const template = await getAdminEmailTemplate(input.id);
  if (!template) {
    return { ok: false, formError: "That email template no longer exists." };
  }
  return sendMail({
    to: input.to,
    subject: `[Test] ${substitutePlaceholders(template.subject)}`,
    text: substitutePlaceholders(template.body),
  });
}
