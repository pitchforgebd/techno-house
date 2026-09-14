/**
 * Client-safe ticket helpers (no Prisma / Node imports).
 */
export const TICKETS_DB_REQUIRED =
  "Support tickets need the database. Remove DATA_SOURCE=mock.";

export const TICKET_SUBJECT_MAX = 80;
export const TICKET_SUBJECT_MIN = 4;
export const TICKET_MESSAGE_MAX = 1000;
export const TICKET_MESSAGE_MIN = 12;

export type CustomerTicketTopic =
  | "order"
  | "product"
  | "warranty"
  | "payment"
  | "other";

export type CustomerTicketDbCategory =
  | "ORDER"
  | "PRODUCT"
  | "WARRANTY"
  | "PAYMENT"
  | "GENERAL";

export const CUSTOMER_TICKET_TOPICS: {
  id: CustomerTicketTopic;
  label: string;
  category: CustomerTicketDbCategory;
}[] = [
  { id: "order", label: "Order", category: "ORDER" },
  { id: "product", label: "Product", category: "PRODUCT" },
  { id: "warranty", label: "Warranty", category: "WARRANTY" },
  { id: "payment", label: "Payment", category: "PAYMENT" },
  { id: "other", label: "Other", category: "GENERAL" },
];

export type CustomerTicketMessage = {
  id: string;
  author: "customer" | "staff";
  body: string;
  createdAt: string;
};

export type CustomerTicketView = {
  id: string;
  number: string;
  topic: CustomerTicketTopic;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  createdAt: string;
  updatedAt: string;
  messages: CustomerTicketMessage[];
};

export type TicketMutationResult =
  | { ok: true; id: string; number: string }
  | { ok: false; formError: string };

export function validateTicketInput(input: {
  topic: string;
  subject: string;
  body: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!CUSTOMER_TICKET_TOPICS.some((row) => row.id === input.topic)) {
    errors.topic = "Select a topic.";
  }
  const subject = input.subject.trim();
  if (subject.length < TICKET_SUBJECT_MIN) {
    errors.subject = `Enter at least ${TICKET_SUBJECT_MIN} characters.`;
  } else if (subject.length > TICKET_SUBJECT_MAX) {
    errors.subject = `Use at most ${TICKET_SUBJECT_MAX} characters.`;
  }
  const body = input.body.trim();
  if (body.length < TICKET_MESSAGE_MIN) {
    errors.body = `Write at least ${TICKET_MESSAGE_MIN} characters.`;
  } else if (body.length > TICKET_MESSAGE_MAX) {
    errors.body = `Use at most ${TICKET_MESSAGE_MAX} characters.`;
  }
  return errors;
}

export function validateTicketReply(input: {
  body: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const body = input.body.trim();
  if (body.length < TICKET_MESSAGE_MIN) {
    errors.body = `Write at least ${TICKET_MESSAGE_MIN} characters.`;
  } else if (body.length > TICKET_MESSAGE_MAX) {
    errors.body = `Use at most ${TICKET_MESSAGE_MAX} characters.`;
  }
  return errors;
}

export function ticketTopicLabel(topic: CustomerTicketTopic): string {
  return CUSTOMER_TICKET_TOPICS.find((row) => row.id === topic)?.label ?? topic;
}
