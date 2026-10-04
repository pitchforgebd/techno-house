/**
 * Admin path → view permission (P11-T04).
 *
 * Longest prefix wins. An empty match is deny, including for Admin — map
 * new routes when they are added. Profile and the forbidden page are open
 * to any signed-in staff.
 */
import type { AdminNavGroup, AdminNavItem } from "@/lib/admin/nav";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permission-check";

type RouteRule = {
  prefix: string;
  anyOf: readonly string[];
};

const ROUTE_RULES: readonly RouteRule[] = [
  { prefix: "/admin/catalog/import", anyOf: ["product.bulk_upload"] },
  { prefix: "/admin/catalog/export", anyOf: ["product.export"] },
  { prefix: "/admin/products", anyOf: ["product.view"] },
  { prefix: "/admin/categories", anyOf: ["category.view"] },
  { prefix: "/admin/brands", anyOf: ["brand.view"] },
  { prefix: "/admin/attributes", anyOf: ["attribute.view"] },
  { prefix: "/admin/units", anyOf: ["units.view"] },
  { prefix: "/admin/warranty", anyOf: ["warranty.view"] },
  { prefix: "/admin/notes", anyOf: ["notes.view"] },
  { prefix: "/admin/labels", anyOf: ["labels.view"] },
  { prefix: "/admin/reviews", anyOf: ["reviews.view"] },
  { prefix: "/admin/questions", anyOf: ["questions.view"] },
  { prefix: "/admin/product-requests", anyOf: ["product_requests.view"] },
  { prefix: "/admin/pc-builder/rules", anyOf: ["pc_builder.rules"] },
  { prefix: "/admin/pc-builder/builds", anyOf: ["pc_builder.builds"] },
  { prefix: "/admin/pc-builder/compatibility", anyOf: ["pc_builder.manage"] },
  { prefix: "/admin/pc-builder", anyOf: ["pc_builder.view"] },
  { prefix: "/admin/orders/unpaid", anyOf: ["orders.view_unpaid"] },
  { prefix: "/admin/orders", anyOf: ["orders.view_all"] },
  { prefix: "/admin/refunds/settings", anyOf: ["refunds.settings"] },
  { prefix: "/admin/refunds", anyOf: ["refunds.view"] },
  { prefix: "/admin/customers/b2b", anyOf: ["customer.b2b.view"] },
  // KYC document stream: the handler checks the same key itself; without a
  // rule here the middleware denied it for every staff member.
  { prefix: "/admin/api/b2b-documents", anyOf: ["customer.b2b.view"] },
  { prefix: "/admin/customers", anyOf: ["customer.view"] },
  { prefix: "/admin/promotions", anyOf: ["promotion.view"] },
  { prefix: "/admin/flash-sales", anyOf: ["flash_deals.view"] },
  { prefix: "/admin/deals", anyOf: ["flash_deals.view"] },
  { prefix: "/admin/coupons", anyOf: ["coupons.view"] },
  { prefix: "/admin/marketing/popups", anyOf: ["popups.view"] },
  { prefix: "/admin/marketing/alerts", anyOf: ["alerts.view"] },
  { prefix: "/admin/marketing/sale-alerts", anyOf: ["alerts.view"] },
  {
    prefix: "/admin/marketing/email-templates",
    anyOf: ["email_templates.view"],
  },
  { prefix: "/admin/marketing/subscribers", anyOf: ["subscribers.view"] },
  { prefix: "/admin/marketing/visitors", anyOf: ["notifications.view"] },
  { prefix: "/admin/marketing/sms", anyOf: ["otp.view"] },
  { prefix: "/admin/newsletter", anyOf: ["newsletter.view"] },
  { prefix: "/admin/blog", anyOf: ["blog.view"] },
  { prefix: "/admin/notifications", anyOf: ["notifications.view"] },
  {
    prefix: "/admin/marketing",
    anyOf: [
      "popups.view",
      "alerts.view",
      "notifications.view",
      "email_templates.view",
      "blog.view",
      "newsletter.view",
      "subscribers.view",
    ],
  },
  { prefix: "/admin/media", anyOf: ["media.view"] },
  { prefix: "/admin/integrations/ga4", anyOf: ["ga4.view"] },
  { prefix: "/admin/integrations/gtm", anyOf: ["gtm.view"] },
  { prefix: "/admin/integrations/merchant-center", anyOf: ["merchant.view"] },
  {
    prefix: "/admin/integrations/facebook-catalog",
    anyOf: ["catalog_analytics.view"],
  },
  { prefix: "/admin/integrations/meta-capi", anyOf: ["meta.view"] },
  { prefix: "/admin/integrations/meta", anyOf: ["meta.view"] },
  {
    prefix: "/admin/integrations/custom-script",
    anyOf: ["custom_scripts.view", "custom_scripts.manage"],
  },
  { prefix: "/admin/sitemap", anyOf: ["sitemap.view"] },
  { prefix: "/admin/seo", anyOf: ["seo.view"] },
  {
    prefix: "/admin/analytics",
    anyOf: [
      "ga4.view",
      "gtm.view",
      "meta.view",
      "merchant.view",
      "catalog_analytics.view",
      "seo.view",
      "sitemap.view",
    ],
  },
  { prefix: "/admin/reports/product-sales", anyOf: ["reports.product_sale"] },
  { prefix: "/admin/reports/stock", anyOf: ["reports.stock"] },
  { prefix: "/admin/reports/wishlist", anyOf: ["reports.wishlist"] },
  { prefix: "/admin/reports/searches", anyOf: ["reports.searches"] },
  { prefix: "/admin/reports/wallet", anyOf: ["reports.wallet"] },
  { prefix: "/admin/reports/compare", anyOf: ["reports.compare"] },
  { prefix: "/admin/reports", anyOf: ["reports.earning"] },
  { prefix: "/admin/design-studio", anyOf: ["design_studio.view"] },
  {
    prefix: "/admin/support/conversations",
    anyOf: ["product_conversations.view"],
  },
  { prefix: "/admin/support", anyOf: ["tickets.view"] },
  { prefix: "/admin/contacts", anyOf: ["contacts.view"] },
  { prefix: "/admin/otp", anyOf: ["otp.view"] },
  { prefix: "/admin/payments/offline", anyOf: ["offline_payment.view"] },
  { prefix: "/admin/payments/emi", anyOf: ["emi.view"] },
  { prefix: "/admin/payments/bkash", anyOf: ["bkash.view"] },
  { prefix: "/admin/payments/nagad", anyOf: ["nagad.view"] },
  { prefix: "/admin/payments/sslcommerz", anyOf: ["sslcommerz.view"] },
  { prefix: "/admin/payments", anyOf: ["payment_methods.view"] },
  { prefix: "/admin/settings/features", anyOf: ["features.view"] },
  { prefix: "/admin/settings/languages", anyOf: ["languages.view"] },
  { prefix: "/admin/settings/currency", anyOf: ["currency.view"] },
  { prefix: "/admin/settings/filesystem", anyOf: ["filesystem.view"] },
  { prefix: "/admin/settings/social", anyOf: ["social_logins.view"] },
  {
    prefix: "/admin/settings/google/recaptcha",
    anyOf: ["google_recaptcha.view"],
  },
  { prefix: "/admin/settings/google/map", anyOf: ["google_map.view"] },
  { prefix: "/admin/settings/google/firebase", anyOf: ["firebase.view"] },
  {
    prefix: "/admin/settings/google",
    anyOf: ["google_recaptcha.view", "google_map.view", "firebase.view"],
  },
  { prefix: "/admin/settings/chat", anyOf: ["chat_widgets.view"] },
  { prefix: "/admin/settings/comments", anyOf: ["comment_system.view"] },
  { prefix: "/admin/smtp", anyOf: ["smtp.view"] },
  { prefix: "/admin/shipping/configuration", anyOf: ["shipping_config.view"] },
  { prefix: "/admin/shipping/rates", anyOf: ["shipping_config.view"] },
  { prefix: "/admin/shipping/countries", anyOf: ["countries.view"] },
  { prefix: "/admin/shipping/states", anyOf: ["states.view"] },
  { prefix: "/admin/shipping/cities", anyOf: ["cities.view"] },
  { prefix: "/admin/shipping/areas", anyOf: ["areas.view"] },
  { prefix: "/admin/shipping/zones", anyOf: ["zones.view"] },
  { prefix: "/admin/shipping/carriers", anyOf: ["carriers.view"] },
  { prefix: "/admin/shipping/pathao", anyOf: ["pathao.view"] },
  { prefix: "/admin/shipping/steadfast", anyOf: ["steadfast.view"] },
  { prefix: "/admin/shipping", anyOf: ["shipping_method.view"] },
  {
    prefix: "/admin/settings/general",
    anyOf: ["business.view"],
  },
  { prefix: "/admin/settings", anyOf: ["business.view"] },
  { prefix: "/admin/staff/roles", anyOf: ["roles.view"] },
  { prefix: "/admin/staff/audit", anyOf: ["audit.view"] },
  { prefix: "/admin/staff", anyOf: ["staff.view"] },
];

function normalizeAdminPath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** `"allow"` = signed-in staff; otherwise any listed key is enough. */
export function permissionKeysForAdminPath(
  pathname: string,
): "allow" | readonly string[] {
  const path = normalizeAdminPath(pathname);

  if (
    path === "/admin/login" ||
    path.startsWith("/admin/access/") ||
    path === "/admin/forbidden"
  ) {
    return "allow";
  }
  if (path === "/admin/profile" || path.startsWith("/admin/profile/")) {
    return "allow";
  }
  // The topbar alert bell polls this. The handler requires a staff session
  // and only ever returns / marks the signed-in staff member's own alerts, so
  // "signed-in staff" is the right gate. It was unmapped — and so denied to
  // everyone — from the moment enforcement moved into the middleware.
  if (path === "/admin/api/order-alerts") {
    return "allow";
  }
  if (path === "/admin") {
    return ["dashboard.view"];
  }

  let best: RouteRule | null = null;
  for (const rule of ROUTE_RULES) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`)) {
      if (!best || rule.prefix.length > best.prefix.length) {
        best = rule;
      }
    }
  }

  return best?.anyOf ?? [];
}

export function canAccessAdminPath(
  pathname: string,
  permissions: readonly string[],
): boolean {
  const required = permissionKeysForAdminPath(pathname);
  if (required === "allow") {
    return true;
  }
  return hasAnyPermission({ permissions }, required);
}

function filterNavItem(
  item: AdminNavItem,
  permissions: readonly string[],
): AdminNavItem | null {
  const children = item.children
    ?.map((child) => filterNavItem(child, permissions))
    .filter((child): child is AdminNavItem => child !== null);

  const selfOk = canAccessAdminPath(item.href, permissions);
  if (selfOk) {
    return children && children.length > 0 ? { ...item, children } : item;
  }
  if (children && children.length > 0) {
    return { ...item, children };
  }
  return null;
}

export function filterAdminNavGroups(
  groups: readonly AdminNavGroup[],
  session: { permissions: readonly string[] } | null,
): AdminNavGroup[] {
  const permissions = session?.permissions ?? [];
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterNavItem(item, permissions))
        .filter((item): item is AdminNavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}

export function staffHomeHref(
  session: { permissions: readonly string[] } | null,
): string {
  return hasPermission(session, "dashboard.view") ? "/admin" : "/admin/profile";
}
