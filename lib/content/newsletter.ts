/**
 * Newsletter subscribers (P15-T04).
 *
 * Rows live on `NewsletterSubscriber`. Campaign issues are not persisted
 * (no table). SMTP send waits for Phase 16. Guests and `DATA_SOURCE=mock`
 * keep the email rows from `MOCK_SUBSCRIBERS`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { MOCK_SUBSCRIBERS } from "@/lib/admin/engagement-mock";
import type { NewsletterSubscriberRow } from "@/lib/content/newsletter-types";
import { getPrisma } from "@/lib/db/prisma";
import {
  notifyStaffSafe,
  STAFF_ALERT_TYPES,
} from "@/lib/orders/staff-order-alerts";
import type { SubscriberStatus as DbSubscriberStatus } from "@/lib/generated/prisma/enums";

export type { NewsletterSubscriberRow } from "@/lib/content/newsletter-types";

export const NEWSLETTER_DB_REQUIRED =
  "Newsletter changes need the database. Turn off DATA_SOURCE=mock to save.";

export type NewsletterMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type NewsletterActor = {
  staffId?: string;
  email?: string;
  ip?: string | null;
};

const STATUS_TO_DB = {
  subscribed: "SUBSCRIBED",
  unsubscribed: "UNSUBSCRIBED",
  bounced: "BOUNCED",
} as const satisfies Record<
  NewsletterSubscriberRow["status"],
  DbSubscriberStatus
>;

const STATUS_FROM_DB: Record<
  DbSubscriberStatus,
  NewsletterSubscriberRow["status"]
> = {
  SUBSCRIBED: "subscribed",
  UNSUBSCRIBED: "unsubscribed",
  BOUNCED: "bounced",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): NewsletterMutationResult {
  return { ok: false, formError };
}

function dateLabel(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 160);
}

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function toAdminSubscriber(row: {
  id: string;
  email: string;
  name: string | null;
  status: DbSubscriberStatus;
  source: string | null;
  subscribedAt: Date;
}): NewsletterSubscriberRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? "",
    status: STATUS_FROM_DB[row.status],
    source: row.source ?? "",
    subscribedAt: dateLabel(row.subscribedAt),
  };
}

function mockSubscribers(): NewsletterSubscriberRow[] {
  return MOCK_SUBSCRIBERS.filter((row) => isEmail(row.title)).map((row) => ({
    id: row.id,
    email: row.title,
    name: "",
    status: row.status === "active" ? "subscribed" : "unsubscribed",
    source: row.subtitle?.toLowerCase() ?? "email",
    subscribedAt: row.updatedAt,
  }));
}

export async function listAdminSubscribers(): Promise<
  NewsletterSubscriberRow[]
> {
  if (!usesDatabase()) {
    return mockSubscribers();
  }
  const rows = await getPrisma().newsletterSubscriber.findMany({
    orderBy: [{ subscribedAt: "desc" }],
  });
  return rows.map(toAdminSubscriber);
}

export async function subscribeNewsletter(input: {
  email: string;
  name?: string;
  source?: string;
  actor?: NewsletterActor;
}): Promise<NewsletterMutationResult> {
  if (!usesDatabase()) {
    return fail(NEWSLETTER_DB_REQUIRED);
  }

  const email = normalizeEmail(input.email);
  if (!email || !isEmail(email)) {
    return fail("Enter a valid email address.");
  }
  const name = input.name?.trim().slice(0, 80) || null;
  const source = input.source?.trim().slice(0, 40) || "footer";

  const existing = await getPrisma().newsletterSubscriber.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (existing) {
    const data = {
      name: name ?? undefined,
      source,
      status: "SUBSCRIBED" as const,
      unsubscribedAt: null,
      ...(existing.status === "UNSUBSCRIBED"
        ? { subscribedAt: new Date() }
        : {}),
    };
    await getPrisma().newsletterSubscriber.update({
      where: { id: existing.id },
      data,
    });
    await writeAuditLog({
      actorType: input.actor?.staffId ? "STAFF" : "CUSTOMER",
      actorId: input.actor?.staffId ?? null,
      actorLabel: input.actor?.email ?? email,
      action: AUDIT_ACTIONS.NEWSLETTER_SUBSCRIBE,
      entityType: "NewsletterSubscriber",
      entityId: existing.id,
      metadata: { email, source, resumed: existing.status === "UNSUBSCRIBED" },
      ip: input.actor?.ip,
    });
    if (!input.actor?.staffId && existing.status === "UNSUBSCRIBED") {
      notifyStaffSafe({
        type: STAFF_ALERT_TYPES.NEWSLETTER_SUBSCRIBE,
        title: "Newsletter re-subscribe",
        body: email,
        href: "/admin/newsletter",
      });
    }
    return { ok: true, id: existing.id };
  }

  const created = await getPrisma().newsletterSubscriber.create({
    data: {
      email,
      name,
      source,
      status: "SUBSCRIBED",
    },
    select: { id: true },
  });
  await writeAuditLog({
    actorType: input.actor?.staffId ? "STAFF" : "CUSTOMER",
    actorId: input.actor?.staffId ?? null,
    actorLabel: input.actor?.email ?? email,
    action: AUDIT_ACTIONS.NEWSLETTER_SUBSCRIBE,
    entityType: "NewsletterSubscriber",
    entityId: created.id,
    metadata: { email, source },
    ip: input.actor?.ip,
  });
  if (!input.actor?.staffId) {
    notifyStaffSafe({
      type: STAFF_ALERT_TYPES.NEWSLETTER_SUBSCRIBE,
      title: "New newsletter subscriber",
      body: email,
      href: "/admin/newsletter",
    });
  }
  return { ok: true, id: created.id };
}

export async function setSubscriberStatus(input: {
  id: string;
  status: string;
  actor?: NewsletterActor;
}): Promise<NewsletterMutationResult> {
  if (!usesDatabase()) {
    return fail(NEWSLETTER_DB_REQUIRED);
  }
  if (!(input.status in STATUS_TO_DB)) {
    return fail("Choose a valid subscriber status.");
  }
  const status = input.status as NewsletterSubscriberRow["status"];
  const id = input.id.trim();
  if (!id) {
    return fail("Choose a subscriber.");
  }
  const existing = await getPrisma().newsletterSubscriber.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
  if (!existing) {
    return fail("That subscriber no longer exists.");
  }

  await getPrisma().newsletterSubscriber.update({
    where: { id },
    data: {
      status: STATUS_TO_DB[status],
      unsubscribedAt: status === "unsubscribed" ? new Date() : null,
    },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor?.staffId ?? null,
    actorLabel: input.actor?.email ?? existing.email,
    action: AUDIT_ACTIONS.NEWSLETTER_STATUS,
    entityType: "NewsletterSubscriber",
    entityId: existing.id,
    metadata: { email: existing.email, status },
    ip: input.actor?.ip,
  });
  return { ok: true, id };
}
