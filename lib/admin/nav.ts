/**
 * Admin sidebar IA — Phase 09 shell (UI only).
 * Marketing engagement modules adapted for single-vendor Techno House.
 */

export type AdminNavItem = {
  href: string;
  label: string;
  /** Optional badge hint for later modules (display only). */
  badge?: string;
  /** Nested items (e.g. Blog, Notifications). */
  children?: readonly AdminNavItem[];
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: readonly AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    id: "overview",
    label: "Home",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/brands", label: "Brands" },
      { href: "/admin/attributes", label: "Attributes" },
      { href: "/admin/units", label: "Units" },
      { href: "/admin/warranty", label: "Warranty" },
      { href: "/admin/notes", label: "Notes" },
      { href: "/admin/labels", label: "Custom labels" },
      { href: "/admin/catalog/import", label: "Bulk import" },
      { href: "/admin/catalog/export", label: "Bulk export" },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/questions", label: "Questions" },
      { href: "/admin/product-requests", label: "Product requests" },
      {
        href: "/admin/pc-builder",
        label: "PC Builder",
        children: [
          { href: "/admin/pc-builder", label: "Overview" },
          {
            href: "/admin/pc-builder/rules",
            label: "Compatibility rules",
          },
          { href: "/admin/pc-builder/builds", label: "Saved builds" },
        ],
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/orders/unpaid", label: "Unpaid orders" },
      { href: "/admin/refunds", label: "Refunds" },
      { href: "/admin/refunds/disputes", label: "Dispute refunds" },
      { href: "/admin/refunds/settings", label: "Refund settings" },
      { href: "/admin/refunds/reasons", label: "Refund reasons" },
      { href: "/admin/refunds/categories", label: "Category refunds" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    items: [
      {
        href: "/admin/customers",
        label: "Customers",
        children: [
          { href: "/admin/customers", label: "All customers" },
          { href: "/admin/customers/b2b", label: "B2B accounts" },
          { href: "/admin/customers/b2b/pricing", label: "B2B pricing" },
        ],
      },
    ],
  },
  {
    id: "merchandising",
    label: "Promotions",
    items: [
      {
        href: "/admin/promotions",
        label: "Promotion & Offers",
        children: [
          { href: "/admin/promotions", label: "Overview" },
          { href: "/admin/promotions/campaigns", label: "Campaigns" },
          {
            href: "/admin/promotions/products",
            label: "Promotional products",
          },
          {
            href: "/admin/promotions/category-discounts",
            label: "Category discounts",
          },
          { href: "/admin/flash-sales", label: "Flash deals" },
          { href: "/admin/deals", label: "Today's deal" },
        ],
      },
      { href: "/admin/coupons", label: "Coupons" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { href: "/admin/marketing", label: "Marketing" },
      { href: "/admin/marketing/popups", label: "Dynamic Pop-ups" },
      { href: "/admin/marketing/alerts", label: "Custom Alerts" },
      { href: "/admin/marketing/sale-alerts", label: "Custom Sale Alert" },
      { href: "/admin/marketing/email-templates", label: "Email Templates" },
      { href: "/admin/newsletter", label: "Newsletters" },
      {
        href: "/admin/blog",
        label: "Blogs",
        children: [
          { href: "/admin/blog", label: "All posts" },
          { href: "/admin/blog/categories", label: "Categories" },
        ],
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        children: [
          { href: "/admin/notifications/types", label: "Notification types" },
          { href: "/admin/notifications/custom", label: "Send custom" },
          {
            href: "/admin/notifications/history",
            label: "Notification history",
          },
          { href: "/admin/notifications/settings", label: "Settings" },
        ],
      },
      { href: "/admin/marketing/subscribers", label: "Subscribers" },
      { href: "/admin/marketing/visitors", label: "Custom Visitors" },
      { href: "/admin/marketing/sms", label: "Bulk SMS" },
    ],
  },
  {
    id: "content",
    label: "Media",
    items: [{ href: "/admin/media", label: "Media library" }],
  },
  {
    id: "insights",
    label: "Analytics",
    items: [
      {
        href: "/admin/analytics",
        label: "Marketing Analytics",
        children: [
          { href: "/admin/analytics", label: "Overview" },
          {
            href: "/admin/integrations/ga4",
            label: "Google Analytics (GA4)",
          },
          {
            href: "/admin/integrations/gtm",
            label: "Google Tag Manager",
          },
          {
            href: "/admin/integrations/merchant-center",
            label: "Google Merchant Center",
            children: [
              {
                href: "/admin/integrations/merchant-center",
                label: "Settings",
              },
              {
                href: "/admin/integrations/merchant-center/feed",
                label: "Product feed",
              },
            ],
          },
          {
            href: "/admin/integrations/facebook-catalog",
            label: "Meta Shop Sync",
            children: [
              {
                href: "/admin/integrations/facebook-catalog",
                label: "Catalogue setting",
              },
              {
                href: "/admin/integrations/facebook-catalog/feed",
                label: "Catalog products",
              },
            ],
          },
          { href: "/admin/integrations/meta", label: "Meta Pixel" },
          {
            href: "/admin/integrations/meta-capi",
            label: "Meta Conversion API",
          },
          { href: "/admin/sitemap", label: "Sitemap generator" },
          {
            href: "/admin/integrations/custom-script",
            label: "Custom scripts",
          },
          { href: "/admin/seo", label: "Global SEO" },
        ],
      },
    ],
  },
  {
    id: "report",
    label: "Reports",
    items: [
      {
        href: "/admin/reports",
        label: "Report Center",
        children: [
          { href: "/admin/reports", label: "Earning Report" },
          {
            href: "/admin/reports/product-sales",
            label: "Product Sale",
          },
          { href: "/admin/reports/stock", label: "Products Stock" },
          {
            href: "/admin/reports/wishlist",
            label: "Products wishlist",
          },
          { href: "/admin/reports/searches", label: "User Searches" },
          {
            href: "/admin/reports/wallet",
            label: "Wallet Adjustment Ledger",
          },
          {
            href: "/admin/reports/compare",
            label: "Products Compare",
          },
        ],
      },
    ],
  },
  {
    id: "experience",
    label: "Appearance",
    items: [
      {
        href: "/admin/design-studio",
        label: "Design Studio",
        children: [
          { href: "/admin/design-studio", label: "Overview" },
          { href: "/admin/design-studio/appearance", label: "Appearance" },
          { href: "/admin/design-studio/typography", label: "Typography" },
          { href: "/admin/design-studio/logo", label: "Logo & favicon" },
          { href: "/admin/design-studio/banners", label: "Banners & sliders" },
          { href: "/admin/design-studio/pages", label: "Pages" },
          { href: "/admin/design-studio/auth", label: "Auth pages" },
          {
            href: "/admin/design-studio/footer-widgets",
            label: "Footer widgets",
          },
          {
            href: "/admin/design-studio/admin-navbar",
            label: "Admin navbar",
          },
        ],
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      {
        href: "/admin/support",
        label: "Support & Communication",
        children: [
          { href: "/admin/support", label: "Ticket" },
          {
            href: "/admin/support/conversations",
            label: "Product Conversations",
          },
          { href: "/admin/contacts", label: "Contacts" },
        ],
      },
    ],
  },
  {
    id: "operations",
    label: "Messaging",
    items: [{ href: "/admin/otp", label: "OTP / SMS gateway" }],
  },
  {
    id: "integrations",
    label: "Payments",
    items: [
      {
        href: "/admin/payments",
        label: "Payment Gateways",
        children: [
          { href: "/admin/payments", label: "Payment Methods" },
          { href: "/admin/payments/offline", label: "Offline payments" },
          { href: "/admin/payments/emi", label: "EMI Settings" },
        ],
      },
    ],
  },
  {
    id: "setup",
    label: "Settings",
    items: [
      {
        href: "/admin/settings",
        label: "Setup & Configurations",
        children: [
          { href: "/admin/settings", label: "Business Settings" },
          {
            href: "/admin/settings/features",
            label: "Features activation",
          },
          { href: "/admin/settings/languages", label: "Languages" },
          { href: "/admin/settings/currency", label: "Currency" },
          { href: "/admin/smtp", label: "SMTP Settings" },
          {
            href: "/admin/settings/filesystem",
            label: "File System & Cache Configuration",
          },
          {
            href: "/admin/settings/social",
            label: "Social media Logins",
          },
          {
            href: "/admin/settings/google",
            label: "Google",
            children: [
              {
                href: "/admin/settings/google/recaptcha",
                label: "Google reCAPTCHA",
              },
              {
                href: "/admin/settings/google/map",
                label: "Google Map",
              },
              {
                href: "/admin/settings/google/firebase",
                label: "Google Firebase",
              },
            ],
          },
          {
            href: "/admin/settings/chat",
            label: "Chat widgets",
          },
          {
            href: "/admin/settings/comments",
            label: "Social comments",
          },
          {
            href: "/admin/shipping",
            label: "Shipping",
            children: [
              {
                href: "/admin/shipping",
                label: "Select Shipping Method",
              },
              {
                href: "/admin/shipping/configuration",
                label: "Shipping Configuration",
              },
              {
                href: "/admin/shipping/rates",
                label: "Shipping Rates",
              },
              {
                href: "/admin/shipping/zones",
                label: "Shipping Zones",
              },
              {
                href: "/admin/shipping/areas",
                label: "Shipping Areas",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    items: [
      { href: "/admin/staff", label: "All staffs" },
      { href: "/admin/staff/roles", label: "Roles" },
      { href: "/admin/staff/audit", label: "Audit log" },
      { href: "/admin/profile", label: "Profile" },
    ],
  },
] as const;

export function flattenAdminNavHrefs(
  groups: readonly AdminNavGroup[] = ADMIN_NAV_GROUPS,
): string[] {
  const hrefs: string[] = [];

  function walk(items: readonly AdminNavItem[]) {
    for (const item of items) {
      hrefs.push(item.href);
      if (item.children) {
        walk(item.children);
      }
    }
  }

  for (const group of groups) {
    walk(group.items);
  }
  return hrefs;
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (pathname === href) {
    return true;
  }
  if (!pathname.startsWith(`${href}/`)) {
    return false;
  }
  const allHrefs = flattenAdminNavHrefs();
  const longerMatch = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !longerMatch;
}
