export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory =
  | "delivery"
  | "warranty"
  | "order"
  | "product"
  | "general";

export type TicketMessage = {
  id: string;
  author: string;
  role: "customer" | "staff";
  body: string;
  sentAt: string;
};

export type AdminSupportTicket = {
  id: string;
  number: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  updatedAtSort: string;
  messages: TicketMessage[];
};

export const MOCK_ADMIN_TICKETS: readonly AdminSupportTicket[] = [
  {
    id: "tkt-1042-delivery",
    number: "TKT-1042",
    subject: "Delivery delayed — TH-1042",
    customerName: "N. Hasan",
    customerEmail: "n.hasan@example.demo",
    status: "open",
    priority: "urgent",
    category: "delivery",
    orderNumber: "TH-1042",
    createdAt: "2026-08-31 · 09:15",
    updatedAt: "2026-08-31 · 14:00",
    updatedAtSort: "2026-08-31T14:00:00",
    messages: [
      {
        id: "msg-1",
        author: "N. Hasan",
        role: "customer",
        body: "My order was supposed to arrive yesterday. Tracking has not updated since Friday.",
        sentAt: "2026-08-31 · 09:15",
      },
      {
        id: "msg-2",
        author: "Ayesha Rahman",
        role: "staff",
        body: "Thanks for reaching out. We are checking with the courier and will update you within 2 hours.",
        sentAt: "2026-08-31 · 11:30",
      },
    ],
  },
  {
    id: "tkt-warranty-gpu",
    number: "TKT-1041",
    subject: "GPU artifacting after 2 weeks",
    customerName: "S. Akter",
    customerEmail: "s.akter@example.demo",
    status: "pending",
    priority: "high",
    category: "warranty",
    orderNumber: "TH-1038",
    createdAt: "2026-08-30 · 16:40",
    updatedAt: "2026-08-31 · 10:20",
    updatedAtSort: "2026-08-31T10:20:00",
    messages: [
      {
        id: "msg-3",
        author: "S. Akter",
        role: "customer",
        body: "RTX 4060 shows artifacts in games. Serial on box matches invoice.",
        sentAt: "2026-08-30 · 16:40",
      },
    ],
  },
  {
    id: "tkt-order-change",
    number: "TKT-1040",
    subject: "Change shipping address before dispatch",
    customerName: "R. Chowdhury",
    customerEmail: "r.chowdhury@example.demo",
    status: "open",
    priority: "medium",
    category: "order",
    orderNumber: "TH-1046",
    createdAt: "2026-08-31 · 12:05",
    updatedAt: "2026-08-31 · 12:05",
    updatedAtSort: "2026-08-31T12:05:00",
    messages: [
      {
        id: "msg-4",
        author: "R. Chowdhury",
        role: "customer",
        body: "Please ship to my office address instead — order not yet marked shipped.",
        sentAt: "2026-08-31 · 12:05",
      },
    ],
  },
  {
    id: "tkt-product-fit",
    number: "TKT-1039",
    subject: "Will this RAM fit B650 board?",
    customerName: "M. Islam",
    customerEmail: "m.islam@example.demo",
    status: "resolved",
    priority: "low",
    category: "product",
    orderNumber: null,
    createdAt: "2026-08-29 · 08:22",
    updatedAt: "2026-08-29 · 15:00",
    updatedAtSort: "2026-08-29T15:00:00",
    messages: [
      {
        id: "msg-5",
        author: "M. Islam",
        role: "customer",
        body: "DDR5 kit listing says compatible but I want confirmation for Volt B650.",
        sentAt: "2026-08-29 · 08:22",
      },
      {
        id: "msg-6",
        author: "Support",
        role: "staff",
        body: "Yes — QVL lists this kit. Link sent to PC Builder compatibility note.",
        sentAt: "2026-08-29 · 15:00",
      },
    ],
  },
  {
    id: "tkt-general-hours",
    number: "TKT-1038",
    subject: "Showroom weekend hours?",
    customerName: "F. Begum",
    customerEmail: "f.begum@example.demo",
    status: "closed",
    priority: "low",
    category: "general",
    orderNumber: null,
    createdAt: "2026-08-28 · 19:10",
    updatedAt: "2026-08-29 · 09:00",
    updatedAtSort: "2026-08-29T09:00:00",
    messages: [
      {
        id: "msg-7",
        author: "F. Begum",
        role: "customer",
        body: "Are you open Saturday evening for pickup?",
        sentAt: "2026-08-28 · 19:10",
      },
    ],
  },
];

export type ContactStatus = "new" | "read" | "replied" | "archived";

export type AdminContactSubmission = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  reply: string;
  staffNotes?: string;
  status: ContactStatus;
  submittedAt: string;
  submittedAtSort: string;
  source: "contact form" | "product request" | "footer" | "support";
};

export const MOCK_ADMIN_CONTACTS: readonly AdminContactSubmission[] = [
  {
    id: "cnt-bulk-order",
    name: "Karim Enterprises",
    email: "procurement@karim.demo",
    phone: "+880 1711-000001",
    subject: "Bulk laptop quote for office rollout",
    message:
      "Need 25 units with similar spec to ProBook 15. Please share B2B pricing.",
    reply: "",
    status: "new",
    submittedAt: "2026-08-31 · 13:40",
    submittedAtSort: "2026-08-31T13:40:00",
    source: "contact form",
  },
  {
    id: "cnt-product-request",
    name: "T. Rahman",
    email: "t.rahman@example.demo",
    phone: "+880 1812-000002",
    subject: "Looking for Thunderbolt dock",
    message: "Do you stock CalDigit or similar TB4 docks? Not on site.",
    reply: "",
    status: "read",
    submittedAt: "2026-08-30 · 10:15",
    submittedAtSort: "2026-08-30T10:15:00",
    source: "product request",
  },
  {
    id: "cnt-partnership",
    name: "Nova Retail",
    email: "hello@nova.demo",
    phone: "+880 1913-000003",
    subject: "Partnership enquiry",
    message: "We run 3 stores in Chittagong — interested in authorized dealer terms.",
    reply: "Shared dealer pack and pricing sheet by email.",
    status: "replied",
    submittedAt: "2026-08-28 · 16:00",
    submittedAtSort: "2026-08-28T16:00:00",
    source: "contact form",
  },
  {
    id: "cnt-footer-support",
    name: "Anonymous",
    email: "visitor@example.demo",
    phone: "—",
    subject: "Invoice copy request",
    message: "Lost email with invoice for TH-1020. Can you resend?",
    reply: "Invoice resent to registered email.",
    status: "archived",
    submittedAt: "2026-08-25 · 09:30",
    submittedAtSort: "2026-08-25T09:30:00",
    source: "footer",
  },
];

