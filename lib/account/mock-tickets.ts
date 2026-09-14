export const MOCK_TICKETS_KEY = "techno-house-mock-tickets-v1";
export const MAX_MOCK_TICKETS = 20;
export const MAX_TICKET_MESSAGES = 20;

export const TICKET_SUBJECT_MAX = 80;
export const TICKET_SUBJECT_MIN = 4;
export const TICKET_MESSAGE_MAX = 1000;
export const TICKET_MESSAGE_MIN = 12;

export type MockTicketTopic =
  "order" | "product" | "warranty" | "payment" | "other";

export type MockTicketStatus = "open";

export const MOCK_TICKET_TOPICS: {
  id: MockTicketTopic;
  label: string;
}[] = [
  { id: "order", label: "Order" },
  { id: "product", label: "Product" },
  { id: "warranty", label: "Warranty" },
  { id: "payment", label: "Payment" },
  { id: "other", label: "Other" },
];

export type MockTicketMessage = {
  id: string;
  author: "customer";
  body: string;
  createdAt: string;
};

export type MockTicket = {
  id: string;
  topic: MockTicketTopic;
  subject: string;
  createdAt: string;
  updatedAt: string;
  status: MockTicketStatus;
  messages: MockTicketMessage[];
};

export function createMockTicketId(): string {
  return `THT-${Date.now().toString(36).toUpperCase()}`;
}

export function createMockTicketMessageId(): string {
  return `THM-${Date.now().toString(36).toUpperCase()}`;
}

export function normalizeTicketIdParam(raw: string): string {
  return raw.trim().slice(0, 64);
}

export function isMockTicketId(id: string): boolean {
  return /^THT-[A-Z0-9]+$/i.test(id);
}

export function mockTicketTopicLabel(topic: MockTicketTopic): string {
  return MOCK_TICKET_TOPICS.find((item) => item.id === topic)?.label ?? topic;
}

export function isMockTicketTopic(raw: string): raw is MockTicketTopic {
  return MOCK_TICKET_TOPICS.some((item) => item.id === raw);
}

export function validateMockTicketInput(input: {
  topic: string;
  subject: string;
  body: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isMockTicketTopic(input.topic)) {
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

export function validateMockTicketReply(input: {
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

function parseMessage(raw: unknown): MockTicketMessage | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<MockTicketMessage>;
  if (typeof data.id !== "string" || typeof data.body !== "string") {
    return null;
  }
  if (typeof data.createdAt !== "string") {
    return null;
  }
  const body = data.body.trim().slice(0, TICKET_MESSAGE_MAX);
  if (!body) {
    return null;
  }
  return {
    id: data.id.slice(0, 32),
    author: "customer",
    body,
    createdAt: data.createdAt,
  };
}

function parseTicket(raw: unknown): MockTicket | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<MockTicket>;
  if (typeof data.id !== "string" || !isMockTicketId(data.id)) {
    return null;
  }
  if (typeof data.topic !== "string" || !isMockTicketTopic(data.topic)) {
    return null;
  }
  if (typeof data.subject !== "string" || typeof data.createdAt !== "string") {
    return null;
  }
  const messages: MockTicketMessage[] = [];
  const seen = new Set<string>();
  if (Array.isArray(data.messages)) {
    for (const item of data.messages) {
      const parsed = parseMessage(item);
      if (!parsed || seen.has(parsed.id)) {
        continue;
      }
      seen.add(parsed.id);
      messages.push(parsed);
      if (messages.length >= MAX_TICKET_MESSAGES) {
        break;
      }
    }
  }
  if (messages.length === 0) {
    return null;
  }
  const subject = data.subject.trim().slice(0, TICKET_SUBJECT_MAX);
  if (subject.length < TICKET_SUBJECT_MIN) {
    return null;
  }
  return {
    id: normalizeTicketIdParam(data.id),
    topic: data.topic,
    subject,
    createdAt: data.createdAt,
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : data.createdAt,
    status: "open",
    messages,
  };
}

export function normalizeMockTickets(raw: unknown): MockTicket[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const tickets: MockTicket[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = parseTicket(item);
    if (!parsed || seen.has(parsed.id)) {
      continue;
    }
    seen.add(parsed.id);
    tickets.push(parsed);
    if (tickets.length >= MAX_MOCK_TICKETS) {
      break;
    }
  }
  return tickets;
}

export function appendMockTicket(
  tickets: MockTicket[],
  ticket: MockTicket,
): MockTicket[] {
  const parsed = parseTicket(ticket);
  if (!parsed) {
    return tickets;
  }
  const rest = tickets.filter((item) => item.id !== parsed.id);
  return [parsed, ...rest].slice(0, MAX_MOCK_TICKETS);
}

export function appendMockTicketMessage(
  tickets: MockTicket[],
  ticketId: string,
  message: MockTicketMessage,
): MockTicket[] {
  const parsedMessage = parseMessage(message);
  const id = normalizeTicketIdParam(ticketId);
  if (!parsedMessage || !isMockTicketId(id)) {
    return tickets;
  }
  return tickets.map((ticket) => {
    if (ticket.id !== id) {
      return ticket;
    }
    if (ticket.messages.length >= MAX_TICKET_MESSAGES) {
      return ticket;
    }
    if (ticket.messages.some((item) => item.id === parsedMessage.id)) {
      return ticket;
    }
    return {
      ...ticket,
      updatedAt: parsedMessage.createdAt,
      messages: [...ticket.messages, parsedMessage],
    };
  });
}

export function findMockTicket(
  tickets: MockTicket[],
  ticketId: string,
): MockTicket | null {
  const id = normalizeTicketIdParam(ticketId);
  return tickets.find((ticket) => ticket.id === id) ?? null;
}

export function removeMockTicket(
  tickets: MockTicket[],
  ticketId: string,
): MockTicket[] {
  const id = normalizeTicketIdParam(ticketId);
  return tickets.filter((ticket) => ticket.id !== id);
}

export function readStoredTickets(): MockTicket[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_TICKETS_KEY);
    return raw ? normalizeMockTickets(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function persistMockTickets(tickets: MockTicket[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      MOCK_TICKETS_KEY,
      JSON.stringify(normalizeMockTickets(tickets)),
    );
  } catch {
    // Ignore quota / private mode.
  }
}

export function createMockTicket(input: {
  topic: MockTicketTopic;
  subject: string;
  body: string;
}): MockTicket {
  const createdAt = new Date().toISOString();
  return {
    id: createMockTicketId(),
    topic: input.topic,
    subject: input.subject.trim().slice(0, TICKET_SUBJECT_MAX),
    createdAt,
    updatedAt: createdAt,
    status: "open",
    messages: [
      {
        id: createMockTicketMessageId(),
        author: "customer",
        body: input.body.trim().slice(0, TICKET_MESSAGE_MAX),
        createdAt,
      },
    ],
  };
}
