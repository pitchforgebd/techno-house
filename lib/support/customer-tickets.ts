/**
 * Customer support tickets (PostgreSQL SupportTicket / SupportMessage).
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getPrisma } from "@/lib/db/prisma";
import {
  notifyStaffSafe,
  STAFF_ALERT_TYPES,
} from "@/lib/orders/staff-order-alerts";
import { usesDatabase } from "@/lib/runtime/data-source";
import type { TicketCategory as DbTicketCategory } from "@/lib/generated/prisma/enums";
import {
  CUSTOMER_TICKET_TOPICS,
  TICKET_MESSAGE_MAX,
  TICKET_SUBJECT_MAX,
  TICKETS_DB_REQUIRED,
  validateTicketInput,
  validateTicketReply,
  type CustomerTicketTopic,
  type CustomerTicketView,
  type TicketMutationResult,
} from "@/lib/support/customer-ticket-shared";

export {
  CUSTOMER_TICKET_TOPICS,
  TICKET_MESSAGE_MAX,
  TICKET_MESSAGE_MIN,
  TICKET_SUBJECT_MAX,
  TICKET_SUBJECT_MIN,
  TICKETS_DB_REQUIRED,
  ticketTopicLabel,
  validateTicketInput,
  validateTicketReply,
  type CustomerTicketMessage,
  type CustomerTicketTopic,
  type CustomerTicketView,
  type TicketMutationResult,
} from "@/lib/support/customer-ticket-shared";

function topicFromCategory(category: DbTicketCategory): CustomerTicketTopic {
  switch (category) {
    case "ORDER":
      return "order";
    case "PRODUCT":
      return "product";
    case "WARRANTY":
      return "warranty";
    case "PAYMENT":
      return "payment";
    default:
      return "other";
  }
}

function categoryFromTopic(topic: CustomerTicketTopic): DbTicketCategory {
  return (
    CUSTOMER_TICKET_TOPICS.find((row) => row.id === topic)?.category ??
    "GENERAL"
  );
}

function toStatus(
  status: "OPEN" | "PENDING" | "RESOLVED" | "CLOSED",
): CustomerTicketView["status"] {
  switch (status) {
    case "PENDING":
      return "pending";
    case "RESOLVED":
      return "resolved";
    case "CLOSED":
      return "closed";
    default:
      return "open";
  }
}

function createTicketNumber(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `THT-${y}${m}${d}-${rand}`;
}

export async function listCustomerTickets(): Promise<CustomerTicketView[]> {
  if (!usesDatabase()) {
    return [];
  }
  const session = await getCustomerSession();
  if (!session) {
    return [];
  }
  const rows = await getPrisma().supportTicket.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 40 },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    topic: topicFromCategory(row.category),
    subject: row.subject,
    status: toStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages.map((message) => ({
      id: message.id,
      author: message.authorType === "STAFF" ? "staff" : "customer",
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  }));
}

export async function getCustomerTicketById(
  id: string,
): Promise<CustomerTicketView | null> {
  if (!usesDatabase()) {
    return null;
  }
  const session = await getCustomerSession();
  if (!session) {
    return null;
  }
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().supportTicket.findFirst({
    where: {
      userId: session.userId,
      OR: [{ id: trimmed }, { number: trimmed }],
    },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 40 },
    },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    number: row.number,
    topic: topicFromCategory(row.category),
    subject: row.subject,
    status: toStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messages: row.messages.map((message) => ({
      id: message.id,
      author: message.authorType === "STAFF" ? "staff" : "customer",
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function createCustomerTicket(input: {
  topic: string;
  subject: string;
  body: string;
}): Promise<TicketMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: TICKETS_DB_REQUIRED };
  }
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to open a support ticket." };
  }
  const errors = validateTicketInput(input);
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      formError: Object.values(errors)[0] ?? "Check the form.",
    };
  }
  const topic = input.topic as CustomerTicketTopic;
  const subject = input.subject.trim().slice(0, TICKET_SUBJECT_MAX);
  const body = input.body.trim().slice(0, TICKET_MESSAGE_MAX);

  const user = await getPrisma().user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true, email: true },
  });
  if (!user) {
    return { ok: false, formError: "Sign in to open a support ticket." };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const number = createTicketNumber();
    try {
      const created = await getPrisma().supportTicket.create({
        data: {
          number,
          userId: user.id,
          subject,
          customerName: user.fullName,
          customerEmail: user.email,
          status: "OPEN",
          priority: "MEDIUM",
          category: categoryFromTopic(topic),
          messages: {
            create: {
              authorType: "CUSTOMER",
              authorName: user.fullName,
              body,
            },
          },
        },
        select: { id: true, number: true },
      });
      notifyStaffSafe({
        type: STAFF_ALERT_TYPES.TICKET_OPENED,
        title: `New ticket ${created.number}`,
        body: `${user.fullName} · ${subject}`,
        href: `/admin/support/${created.id}`,
      });
      return { ok: true, id: created.id, number: created.number };
    } catch (error) {
      const unique =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002";
      if (!unique || attempt === 2) {
        throw error;
      }
    }
  }
  return { ok: false, formError: "Could not create the ticket. Try again." };
}

export async function replyCustomerTicket(input: {
  ticketId: string;
  body: string;
}): Promise<TicketMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: TICKETS_DB_REQUIRED };
  }
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to reply." };
  }
  const errors = validateTicketReply(input);
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      formError: Object.values(errors)[0] ?? "Check the message.",
    };
  }
  const ticketId = input.ticketId.trim();
  const body = input.body.trim().slice(0, TICKET_MESSAGE_MAX);
  const user = await getPrisma().user.findUnique({
    where: { id: session.userId },
    select: { id: true, fullName: true },
  });
  if (!user) {
    return { ok: false, formError: "Sign in to reply." };
  }
  const ticket = await getPrisma().supportTicket.findFirst({
    where: { id: ticketId, userId: user.id },
    select: { id: true, number: true, status: true },
  });
  if (!ticket) {
    return { ok: false, formError: "That ticket was not found." };
  }
  if (ticket.status === "CLOSED") {
    return { ok: false, formError: "This ticket is closed." };
  }
  await getPrisma().supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorType: "CUSTOMER",
      authorName: user.fullName,
      body,
    },
  });
  await getPrisma().supportTicket.update({
    where: { id: ticket.id },
    data: { updatedAt: new Date(), status: "OPEN" },
  });
  notifyStaffSafe({
    type: STAFF_ALERT_TYPES.TICKET_REPLY,
    title: `Ticket reply ${ticket.number}`,
    body: `${user.fullName} replied`,
    href: `/admin/support/${ticket.id}`,
  });
  return { ok: true, id: ticket.id, number: ticket.number };
}
