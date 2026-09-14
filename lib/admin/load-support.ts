/**
 * Admin support reads (wired to PostgreSQL when DATA_SOURCE ≠ mock).
 *
 * Tickets → `SupportTicket` / `SupportMessage`.
 * Contacts → `Complaint` (contact form / product request / footer).
 * Mock rows remain only for `DATA_SOURCE=mock`.
 */
import {
  MOCK_ADMIN_CONTACTS,
  MOCK_ADMIN_TICKETS,
  type AdminContactSubmission,
  type AdminSupportTicket,
  type ContactStatus,
  type TicketCategory,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/admin/support-mock";
import {
  ADMIN_SUPPORT_PAGE_SIZE,
  type ContactListParams,
  type TicketListParams,
} from "@/lib/admin/support-list-params";
import { getPrisma } from "@/lib/db/prisma";
import type {
  ActorType,
  ComplaintSource as DbComplaintSource,
  ComplaintStatus as DbComplaintStatus,
  TicketCategory as DbTicketCategory,
  TicketPriority as DbTicketPriority,
  TicketStatus as DbTicketStatus,
} from "@/lib/generated/prisma/enums";
import {
  TICKET_MESSAGE_MAX,
  TICKET_MESSAGE_MIN,
} from "@/lib/support/customer-ticket-shared";
import { sendMail } from "@/lib/mail/send";

export type AdminTicketListResult = {
  items: AdminSupportTicket[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: TicketListParams;
};

export type AdminContactListResult = {
  items: AdminContactSubmission[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: ContactListParams;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function formatDateTime(value: Date): { label: string; sort: string } {
  const sort = value.toISOString();
  const label = value.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { label: label.replace(",", " ·"), sort };
}

function toTicketStatus(status: DbTicketStatus): TicketStatus {
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

function toDbTicketStatus(status: TicketStatus): DbTicketStatus {
  switch (status) {
    case "pending":
      return "PENDING";
    case "resolved":
      return "RESOLVED";
    case "closed":
      return "CLOSED";
    default:
      return "OPEN";
  }
}

function toTicketPriority(priority: DbTicketPriority): TicketPriority {
  switch (priority) {
    case "LOW":
      return "low";
    case "HIGH":
      return "high";
    case "URGENT":
      return "urgent";
    default:
      return "medium";
  }
}

function toDbTicketPriority(priority: TicketPriority): DbTicketPriority {
  switch (priority) {
    case "low":
      return "LOW";
    case "high":
      return "HIGH";
    case "urgent":
      return "URGENT";
    default:
      return "MEDIUM";
  }
}

function toTicketCategory(category: DbTicketCategory): TicketCategory {
  switch (category) {
    case "DELIVERY":
      return "delivery";
    case "WARRANTY":
      return "warranty";
    case "ORDER":
      return "order";
    case "PRODUCT":
      return "product";
    default:
      return "general";
  }
}

function toMessageRole(authorType: ActorType): TicketMessage["role"] {
  return authorType === "STAFF" || authorType === "SYSTEM"
    ? "staff"
    : "customer";
}

function toContactStatus(status: DbComplaintStatus): ContactStatus {
  switch (status) {
    case "READ":
      return "read";
    case "REPLIED":
      return "replied";
    case "ARCHIVED":
      return "archived";
    default:
      return "new";
  }
}

function toDbContactStatus(status: ContactStatus): DbComplaintStatus {
  switch (status) {
    case "read":
      return "READ";
    case "replied":
      return "REPLIED";
    case "archived":
      return "ARCHIVED";
    default:
      return "NEW";
  }
}

function toContactSource(
  source: DbComplaintSource,
): AdminContactSubmission["source"] {
  switch (source) {
    case "PRODUCT_REQUEST":
      return "product request";
    case "FOOTER":
      return "footer";
    case "SUPPORT":
      return "support";
    default:
      return "contact form";
  }
}

const ticketSelect = {
  id: true,
  number: true,
  subject: true,
  customerName: true,
  customerEmail: true,
  status: true,
  priority: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  order: { select: { number: true } },
  messages: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      authorType: true,
      authorName: true,
      body: true,
      createdAt: true,
    },
  },
} as const;

type TicketRow = {
  id: string;
  number: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: DbTicketStatus;
  priority: DbTicketPriority;
  category: DbTicketCategory;
  createdAt: Date;
  updatedAt: Date;
  order: { number: string } | null;
  messages: {
    id: string;
    authorType: ActorType;
    authorName: string;
    body: string;
    createdAt: Date;
  }[];
};

function toAdminTicket(row: TicketRow): AdminSupportTicket {
  const created = formatDateTime(row.createdAt);
  const updated = formatDateTime(row.updatedAt);
  return {
    id: row.id,
    number: row.number,
    subject: row.subject,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    status: toTicketStatus(row.status),
    priority: toTicketPriority(row.priority),
    category: toTicketCategory(row.category),
    orderNumber: row.order?.number ?? null,
    createdAt: created.label,
    updatedAt: updated.label,
    updatedAtSort: updated.sort,
    messages: row.messages.map((message) => ({
      id: message.id,
      author: message.authorName,
      role: toMessageRole(message.authorType),
      body: message.body,
      sentAt: formatDateTime(message.createdAt).label,
    })),
  };
}

const complaintSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  subject: true,
  message: true,
  reply: true,
  staffNotes: true,
  status: true,
  source: true,
  createdAt: true,
} as const;

type ComplaintRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  reply: string | null;
  staffNotes: string | null;
  status: DbComplaintStatus;
  source: DbComplaintSource;
  createdAt: Date;
};

function toAdminContact(row: ComplaintRow): AdminContactSubmission {
  const submitted = formatDateTime(row.createdAt);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone?.trim() || "—",
    subject: row.subject?.trim() || "—",
    message: row.message,
    reply: row.reply?.trim() || "",
    staffNotes: row.staffNotes?.trim() || "",
    status: toContactStatus(row.status),
    submittedAt: submitted.label,
    submittedAtSort: submitted.sort,
    source: toContactSource(row.source),
  };
}

function filterMockTickets(params: TicketListParams): AdminSupportTicket[] {
  let items = [...MOCK_ADMIN_TICKETS];
  if (params.status !== "all") {
    items = items.filter((ticket) => ticket.status === params.status);
  }
  if (params.priority !== "all") {
    items = items.filter((ticket) => ticket.priority === params.priority);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (ticket) =>
        ticket.number.toLowerCase().includes(q) ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.customerName.toLowerCase().includes(q) ||
        ticket.customerEmail.toLowerCase().includes(q),
    );
  }
  items.sort((a, b) => b.updatedAtSort.localeCompare(a.updatedAtSort));
  return items;
}

function filterMockContacts(
  params: ContactListParams,
): AdminContactSubmission[] {
  let items = [...MOCK_ADMIN_CONTACTS];
  if (params.status !== "all") {
    items = items.filter((contact) => contact.status === params.status);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (contact) =>
        contact.name.toLowerCase().includes(q) ||
        contact.email.toLowerCase().includes(q) ||
        contact.subject.toLowerCase().includes(q),
    );
  }
  items.sort((a, b) => b.submittedAtSort.localeCompare(a.submittedAtSort));
  return items;
}

function paginateTickets(
  items: AdminSupportTicket[],
  params: TicketListParams,
): AdminTicketListResult {
  const pageSize = ADMIN_SUPPORT_PAGE_SIZE;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

function paginateContacts(
  items: AdminContactSubmission[],
  params: ContactListParams,
): AdminContactListResult {
  const pageSize = ADMIN_SUPPORT_PAGE_SIZE;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function loadAdminTicketList(
  params: TicketListParams,
): Promise<AdminTicketListResult> {
  if (!usesDatabase()) {
    return paginateTickets(filterMockTickets(params), params);
  }

  const where: {
    status?: DbTicketStatus;
    priority?: DbTicketPriority;
    OR?: {
      number?: { contains: string; mode: "insensitive" };
      subject?: { contains: string; mode: "insensitive" };
      customerName?: { contains: string; mode: "insensitive" };
      customerEmail?: { contains: string; mode: "insensitive" };
    }[];
  } = {};

  if (params.status !== "all") {
    where.status = toDbTicketStatus(params.status);
  }
  if (params.priority !== "all") {
    where.priority = toDbTicketPriority(params.priority);
  }
  if (params.q) {
    where.OR = [
      { number: { contains: params.q, mode: "insensitive" } },
      { subject: { contains: params.q, mode: "insensitive" } },
      { customerName: { contains: params.q, mode: "insensitive" } },
      { customerEmail: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const pageSize = ADMIN_SUPPORT_PAGE_SIZE;
  const prisma = getPrisma();
  const total = await prisma.supportTicket.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: ticketSelect,
  });

  return {
    items: rows.map(toAdminTicket),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function loadAdminContactList(
  params: ContactListParams,
): Promise<AdminContactListResult> {
  if (!usesDatabase()) {
    return paginateContacts(filterMockContacts(params), params);
  }

  const where: {
    status?: DbComplaintStatus;
    OR?: {
      name?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      subject?: { contains: string; mode: "insensitive" };
    }[];
  } = {};

  if (params.status !== "all") {
    where.status = toDbContactStatus(params.status);
  }
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { subject: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const pageSize = ADMIN_SUPPORT_PAGE_SIZE;
  const prisma = getPrisma();
  const total = await prisma.complaint.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.complaint.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: complaintSelect,
  });

  return {
    items: rows.map(toAdminContact),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function getAdminTicketById(
  id: string,
): Promise<AdminSupportTicket | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  if (!usesDatabase()) {
    return MOCK_ADMIN_TICKETS.find((ticket) => ticket.id === trimmed) ?? null;
  }

  const row = await getPrisma().supportTicket.findFirst({
    where: {
      OR: [{ id: trimmed }, { number: trimmed }],
    },
    select: ticketSelect,
  });
  return row ? toAdminTicket(row) : null;
}

export async function getAdminContactById(
  id: string,
): Promise<AdminContactSubmission | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  if (!usesDatabase()) {
    return MOCK_ADMIN_CONTACTS.find((contact) => contact.id === trimmed) ?? null;
  }

  const row = await getPrisma().complaint.findUnique({
    where: { id: trimmed },
    select: complaintSelect,
  });
  return row ? toAdminContact(row) : null;
}

export async function updateAdminContact(input: {
  id: string;
  status: ContactStatus;
  reply: string;
  staffNotes?: string;
}): Promise<{ ok: true; mailWarning?: string } | { ok: false; formError: string }> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Database required — remove DATA_SOURCE=mock.",
    };
  }

  const existing = await getPrisma().complaint.findUnique({
    where: { id: input.id },
    select: { id: true, email: true, subject: true, reply: true },
  });
  if (!existing) {
    return { ok: false, formError: "That contact no longer exists." };
  }

  const reply = input.reply.trim().slice(0, 4000);

  await getPrisma().complaint.update({
    where: { id: existing.id },
    data: {
      status: toDbContactStatus(input.status),
      reply: reply || null,
      ...(input.staffNotes !== undefined
        ? { staffNotes: input.staffNotes.trim().slice(0, 2000) || null }
        : {}),
    },
  });

  let mailWarning: string | undefined;
  if (reply && reply !== (existing.reply ?? "")) {
    const mailResult = await sendMail({
      to: existing.email,
      subject: `Re: ${existing.subject?.trim() || "Your inquiry"} — Techno House`,
      text: reply,
    });
    if (!mailResult.ok) {
      mailWarning = `Saved, but the email did not send: ${mailResult.formError}`;
    }
  }
  return mailWarning ? { ok: true, mailWarning } : { ok: true };
}

export async function replyAdminTicket(input: {
  ticketId: string;
  body: string;
  staffName: string;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Database required — remove DATA_SOURCE=mock.",
    };
  }
  const body = input.body.trim().slice(0, TICKET_MESSAGE_MAX);
  if (body.length < TICKET_MESSAGE_MIN) {
    return {
      ok: false,
      formError: `Write at least ${TICKET_MESSAGE_MIN} characters.`,
    };
  }
  const ticketId = input.ticketId.trim();
  const staffName = input.staffName.trim().slice(0, 120) || "Staff";
  const prisma = getPrisma();
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, number: true },
  });
  if (!ticket) {
    return { ok: false, formError: "That ticket was not found." };
  }

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorType: "STAFF",
      authorName: staffName,
      body,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { updatedAt: new Date() },
  });

  if (ticket.userId) {
    await prisma.notification
      .create({
        data: {
          userId: ticket.userId,
          channel: "IN_APP",
          type: "ticket.staff_reply",
          title: `Reply on ${ticket.number}`,
          body: body.slice(0, 160),
          href: `/account/tickets/${ticket.id}`,
          sentAt: new Date(),
        },
      })
      .catch(() => {
        // Alert delivery must not affect the reply.
      });
  }

  return { ok: true };
}

export async function updateAdminTicketStatus(input: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Database required — remove DATA_SOURCE=mock.",
    };
  }
  const ticketId = input.ticketId.trim();
  const prisma = getPrisma();
  const existing = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That ticket was not found." };
  }
  await prisma.supportTicket.update({
    where: { id: existing.id },
    data: {
      status: toDbTicketStatus(input.status),
      priority: toDbTicketPriority(input.priority),
    },
  });
  return { ok: true };
}

export async function countOpenTickets(): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_ADMIN_TICKETS.filter(
      (ticket) => ticket.status === "open" || ticket.status === "pending",
    ).length;
  }

  return getPrisma().supportTicket.count({
    where: { status: { in: ["OPEN", "PENDING"] } },
  });
}
