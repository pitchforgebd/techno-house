/**
 * Marketing engagement mocks — Nexa-style UI (single-vendor).
 */

export type AlertLocation =
  "bottom-left" | "bottom-right" | "top-left" | "top-right";

export type DynamicPopup = {
  id: string;
  title: string;
  link: string;
  enabled: boolean;
  locked: boolean;
  summary?: string;
  buttonText?: string;
};

export type CustomAlert = {
  id: string;
  text: string;
  linkLabel: string;
  link: string;
  type: "Default" | "Custom";
  enabled: boolean;
  locked: boolean;
};

export type EmailTemplateAudience = "all" | "admin" | "customer" | "common";

export type EmailTemplate = {
  id: string;
  emailType: string;
  subject: string;
  audience: EmailTemplateAudience;
  enabled: boolean;
};

export type NotificationAudience = "customer" | "admin";

export type NotificationTypeNexa = {
  id: string;
  name: string;
  defaultText: string;
  audience: NotificationAudience;
  enabled: boolean;
  locked: boolean;
};

export type CustomNotificationHistoryRow = {
  id: string;
  type: string;
  dateTime: string;
  notification: string;
  link: string;
};

export const MOCK_DYNAMIC_POPUPS: DynamicPopup[] = [
  {
    id: "pop-1",
    title: "Subscribe to Our Newsletter",
    link: "#",
    enabled: true,
    locked: true,
    summary: "Join for weekly deals and new arrivals.",
    buttonText: "Subscribe",
  },
  {
    id: "pop-2",
    title: "Product review",
    link: "/products",
    enabled: false,
    locked: false,
    summary: "Share feedback after your purchase.",
    buttonText: "Write a review",
  },
];

export const MOCK_CUSTOM_ALERTS: CustomAlert[] = [
  {
    id: "ca-1",
    text: "Product Title - ordered just now",
    linkLabel: "Custom sale alert",
    link: "#",
    type: "Default",
    enabled: false,
    locked: true,
  },
  {
    id: "ca-2",
    text: "We use cookies for a better experience — check our policy",
    linkLabel: "here",
    link: "/pages/privacy",
    type: "Default",
    enabled: true,
    locked: true,
  },
];

export const MOCK_EMAIL_TEMPLATES_NEXA: EmailTemplate[] = [
  {
    id: "et-1",
    emailType: "Order Placed",
    subject: "Order Placed - [[order_code]]",
    audience: "customer",
    enabled: true,
  },
  {
    id: "et-2",
    emailType: "Order Confirmed",
    subject: "Order Confirmed - [[order_code]]",
    audience: "customer",
    enabled: true,
  },
  {
    id: "et-3",
    emailType: "Order On The Way",
    subject: "Order On The Way - [[order_code]]",
    audience: "customer",
    enabled: false,
  },
  {
    id: "et-4",
    emailType: "Order Delivered",
    subject: "Order Delivered - [[order_code]]",
    audience: "customer",
    enabled: true,
  },
  {
    id: "et-5",
    emailType: "New Order Alert",
    subject: "New order [[order_code]] at [[store_name]]",
    audience: "admin",
    enabled: true,
  },
  {
    id: "et-6",
    emailType: "Password Reset",
    subject: "Reset your [[store_name]] password",
    audience: "common",
    enabled: true,
  },
  {
    id: "et-7",
    emailType: "Email Update Verification",
    subject: "Verify your email for [[store_name]]",
    audience: "common",
    enabled: false,
  },
  {
    id: "et-8",
    emailType: "Wallet Recharge Confirmation",
    subject: "Wallet topped up - [[store_name]]",
    audience: "customer",
    enabled: true,
  },
];

export const MOCK_NOTIFICATION_TYPES_NEXA: NotificationTypeNexa[] = [
  {
    id: "nt-1",
    name: "Order Placed",
    defaultText: "Your Order: [[order_code]] has been Placed",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-2",
    name: "Order Confirmed",
    defaultText: "Your Order: [[order_code]] has been Confirmed",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-3",
    name: "Order Picked Up",
    defaultText: "Your Order: [[order_code]] has been Picked Up",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-4",
    name: "Order On the Way",
    defaultText: "Your Order: [[order_code]] is On the Way",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-5",
    name: "Order Delivered",
    defaultText: "Your Order: [[order_code]] has been Delivered",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-6",
    name: "Order Cancelled",
    defaultText: "Your Order: [[order_code]] has been Cancelled",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-7",
    name: "Successful Payment",
    defaultText: "Payment received for Order: [[order_code]]",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-8",
    name: "Complete Unpaid Order Payment",
    defaultText: "Complete payment for Order: [[order_code]]",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-9",
    name: "Order Tracking",
    defaultText: "Track Order [[order_code]]: [[tracking_code]]",
    audience: "customer",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-10",
    name: "New Order Alert",
    defaultText: "New order [[order_code]] needs attention",
    audience: "admin",
    enabled: true,
    locked: true,
  },
  {
    id: "nt-11",
    name: "Low Stock Alert",
    defaultText: "Stock low for [[product_name]]",
    audience: "admin",
    enabled: false,
    locked: true,
  },
];

/** Empty by default — matches reference empty history. */
export const MOCK_CUSTOM_NOTIFICATION_HISTORY: CustomNotificationHistoryRow[] =
  [];

/** Legacy list shapes kept for blog / newsletter / SMS / subscribers pages. */
export type EngagementStatus = "active" | "draft" | "paused" | "sent";

export type EngagementRow = {
  id: string;
  title: string;
  subtitle?: string;
  status: EngagementStatus;
  meta: string;
  updatedAt: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryId: string | null;
  excerpt: string;
  body: string;
  status: "published" | "draft" | "scheduled";
  author: string;
  publishedAt: string | null;
  seoTitle: string;
  seoDescription: string;
  coverImagePath?: string | null;
  coverImageAlt?: string | null;
  coverMediaId?: string | null;
};

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  status: boolean;
};

export type NotificationTypeRow = {
  id: string;
  name: string;
  channel: "email" | "sms" | "push" | "in_app";
  enabled: boolean;
};

export type CustomNotification = {
  id: string;
  title: string;
  audience: string;
  status: EngagementStatus;
  scheduledAt: string | null;
};

export type NotificationHistoryItem = {
  id: string;
  title: string;
  channel: string;
  recipients: number;
  sentAt: string;
  result: "delivered" | "partial" | "failed";
};

export const MOCK_POPUPS: EngagementRow[] = MOCK_DYNAMIC_POPUPS.map((p) => ({
  id: p.id,
  title: p.title,
  subtitle: p.link,
  status: p.enabled ? "active" : "paused",
  meta: p.locked ? "System" : "Custom",
  updatedAt: "2026-09-01",
}));

export const MOCK_STORE_ALERTS: EngagementRow[] = MOCK_CUSTOM_ALERTS.map(
  (a) => ({
    id: a.id,
    title: a.text,
    subtitle: a.linkLabel,
    status: a.enabled ? "active" : "paused",
    meta: a.type,
    updatedAt: "2026-09-01",
  }),
);

export const MOCK_SALE_ALERTS: EngagementRow[] = [
  {
    id: "sa-1",
    title: "Custom sale alert products",
    subtitle: "Random interval popups",
    status: "paused",
    meta: "Interval off",
    updatedAt: "2026-09-01",
  },
];

export const MOCK_EMAIL_TEMPLATES: EngagementRow[] =
  MOCK_EMAIL_TEMPLATES_NEXA.map((t) => ({
    id: t.id,
    title: t.emailType,
    subtitle: t.subject,
    status: t.enabled ? "active" : "paused",
    meta: t.audience,
    updatedAt: "2026-09-01",
  }));

export const MOCK_NEWSLETTERS: EngagementRow[] = [
  {
    id: "nl-1",
    title: "September PC deals",
    subtitle: "Draft issue",
    status: "draft",
    meta: "0 sent",
    updatedAt: "2026-09-01",
  },
  {
    id: "nl-2",
    title: "Back to school wrap-up",
    subtitle: "Sent campaign",
    status: "sent",
    meta: "2.1k recipients",
    updatedAt: "2026-08-20",
  },
];

export const MOCK_SUBSCRIBERS: EngagementRow[] = [
  {
    id: "sub-1",
    title: "rahim@example.com",
    subtitle: "Email",
    status: "active",
    meta: "Opted in",
    updatedAt: "2026-08-12",
  },
  {
    id: "sub-2",
    title: "01700-000111",
    subtitle: "SMS",
    status: "active",
    meta: "Opted in",
    updatedAt: "2026-08-18",
  },
];

export const MOCK_SMS_CAMPAIGNS: EngagementRow[] = [
  {
    id: "sms-1",
    title: "Flash deal tonight",
    subtitle: "Segment: recent buyers",
    status: "sent",
    meta: "1.2k sent",
    updatedAt: "2026-08-28",
  },
];

export const MOCK_VISITORS: EngagementRow[] = [
  {
    id: "vis-1",
    title: "Product page visitor counter",
    subtitle: "Show personalized counts",
    status: "active",
    meta: "Storefront widget",
    updatedAt: "2026-09-01",
  },
];

export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: "bp-1",
    title: "How to pick a gaming laptop in BD",
    slug: "gaming-laptop-guide",
    category: "Guides",
    categoryId: "bc-1",
    excerpt:
      "A practical checklist for choosing a gaming laptop in Bangladesh: GPU, RAM, display, and what to verify before you buy.",
    body: "A gaming laptop in Bangladesh has to survive heat, load-shedding, and a crowded used-import market. Start with the GPU and the power adapter wattage — a thin chassis with a desktop-class nameplate often cannot sustain that chip.\n\nSixteen gigabytes of RAM is the floor for current titles. Prefer 144 Hz or higher if you play competitive games; 60 Hz is fine for single-player work if the panel is bright enough to use outdoors.\n\nCheck the seller’s local warranty and whether the battery ships with the unit. Compare the same SKU across the catalogue rather than chasing a one-day banner price.",
    status: "published",
    author: "Techno House",
    publishedAt: "2026-08-10",
    seoTitle: "",
    seoDescription: "",
  },
  {
    id: "bp-2",
    title: "DDR5 vs DDR4 for office PCs",
    slug: "ddr5-vs-ddr4",
    category: "Components",
    categoryId: "bc-2",
    excerpt:
      "When an office PC should stay on DDR4, and when DDR5 is worth the extra spend.",
    body: "DDR5 raises bandwidth and typically needs a newer platform. For everyday office work — browsing, spreadsheets, and video calls — a dual-channel DDR4 kit is still enough.\n\nMove to DDR5 when you are also replacing the CPU and motherboard, or when the machine will compile, render, or run many VMs. Mixing kits is a common source of instability; buy a matched pair and leave XMP/EXPO profiles documented for support.",
    status: "draft",
    author: "Techno House",
    publishedAt: null,
    seoTitle: "",
    seoDescription: "",
  },
];

export const MOCK_BLOG_CATEGORIES: BlogCategory[] = [
  {
    id: "bc-1",
    name: "Guides",
    slug: "guides",
    postCount: 8,
    status: true,
  },
  {
    id: "bc-2",
    name: "Components",
    slug: "components",
    postCount: 5,
    status: true,
  },
  {
    id: "bc-3",
    name: "News",
    slug: "news",
    postCount: 2,
    status: false,
  },
];

export const MOCK_NOTIFICATION_TYPES: NotificationTypeRow[] =
  MOCK_NOTIFICATION_TYPES_NEXA.map((n) => ({
    id: n.id,
    name: n.name,
    channel: n.audience === "admin" ? "email" : "push",
    enabled: n.enabled,
  }));

export const MOCK_CUSTOM_NOTIFICATIONS: CustomNotification[] = [
  {
    id: "cn-1",
    title: "Weekend spare parts restock",
    audience: "All customers",
    status: "sent",
    scheduledAt: "2026-08-23 · 10:00",
  },
];

export const MOCK_NOTIFICATION_HISTORY: NotificationHistoryItem[] = [];
