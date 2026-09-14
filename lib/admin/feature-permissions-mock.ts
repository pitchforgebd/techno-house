export type FeaturePermission = { id: string; label: string };

export type FeaturePermissionGroup = {
  id: string;
  label: string;
  permissions: FeaturePermission[];
};

function group(
  id: string,
  label: string,
  permissions: FeaturePermission[],
): FeaturePermissionGroup {
  return { id, label, permissions };
}

function p(id: string, label: string): FeaturePermission {
  return { id, label };
}

export const FEATURE_PERMISSION_GROUPS: FeaturePermissionGroup[] = [
  group("dashboard", "Dashboard", [p("dashboard.view", "View dashboard")]),
  group("product", "Product", [
    p("product.view", "View products"),
    p("product.add", "Add product"),
    p("product.edit", "Edit product"),
    p("product.delete", "Delete product"),
    p("product.bulk_upload", "Bulk upload"),
    p("product.export", "Export products"),
    p("product.smart_bar", "Smart bar"),
  ]),
  group("product_category", "Product category", [
    p("category.view", "View categories"),
    p("category.add", "Add category"),
    p("category.edit", "Edit category"),
    p("category.delete", "Delete category"),
  ]),
  group("brand", "Brand", [
    p("brand.view", "View brands"),
    p("brand.add", "Add brand"),
    p("brand.edit", "Edit brand"),
    p("brand.delete", "Delete brand"),
  ]),
  group("product_attribute", "Product Attribute", [
    p("attribute.view", "View attributes"),
    p("attribute.add", "Add attribute"),
    p("attribute.edit", "Edit attribute"),
    p("attribute.delete", "Delete attribute"),
    p("attribute_values.view", "View attribute values"),
    p("attribute_values.manage", "Manage attribute values"),
    p("colors.view", "View colors"),
    p("colors.manage", "Manage colors"),
    p("units.view", "View units"),
    p("units.manage", "Manage units"),
  ]),
  group("warranty", "Warranty", [
    p("warranty.view", "View warranties"),
    p("warranty.add", "Add warranty"),
    p("warranty.edit", "Edit warranty"),
    p("warranty.delete", "Delete warranty"),
  ]),
  group("notes", "Notes", [
    p("notes.view", "View notes"),
    p("notes.add", "Add note"),
    p("notes.edit", "Edit note"),
    p("notes.delete", "Delete note"),
  ]),
  group("custom_labels", "Custom labels", [
    p("labels.view", "View labels"),
    p("labels.add", "Add label"),
    p("labels.edit", "Edit label"),
    p("labels.delete", "Delete label"),
  ]),
  group("reviews", "Reviews", [
    p("reviews.view", "View reviews"),
    p("reviews.add", "Add review"),
    p("reviews.edit", "Edit review"),
    p("reviews.delete", "Delete review"),
    p("reviews.moderate", "Moderate reviews"),
  ]),
  group("questions", "Questions", [
    p("questions.view", "View questions"),
    p("questions.edit", "Edit question"),
    p("questions.delete", "Delete question"),
    p("questions.answer", "Answer questions"),
  ]),
  group("product_requests", "Product requests", [
    p("product_requests.view", "View product requests"),
    p("product_requests.manage", "Manage product requests"),
  ]),
  group("pc_builder", "PC Builder", [
    p("pc_builder.view", "View PC builder"),
    p("pc_builder.manage", "Manage PC builder"),
    p("pc_builder.rules", "Manage compatibility rules"),
    p("pc_builder.builds", "Manage saved builds"),
  ]),
  group("orders", "Sale / Orders", [
    p("orders.view_all", "View all orders"),
    p("orders.view_unpaid", "View unpaid orders"),
    p("orders.view_details", "View order details"),
    p("orders.payment_status", "Update payment status"),
    p("orders.delivery_status", "Update delivery status"),
    p("orders.delete", "Delete order"),
    p("orders.export", "Export orders"),
    p("orders.shipping_label", "Print shipping label"),
  ]),
  group("refunds", "Refunds", [
    p("refunds.view", "View refunds"),
    p("refunds.process", "Process refunds"),
    p("refunds.settings", "Refund settings"),
  ]),
  group("customer", "Customer", [
    p("customer.view", "View customers"),
    p("customer.add", "Add customer"),
    p("customer.edit", "Edit customer"),
    p("customer.delete", "Delete customer"),
    p("customer.ban", "Ban customer"),
    p("customer.b2b.view", "View B2B accounts"),
    p("customer.b2b.manage", "Manage B2B accounts"),
  ]),
  group("promotion", "Promotion & Offers", [
    p("promotion.view", "View promotions"),
    p("promotion.manage", "Manage promotions"),
  ]),
  group("coupons", "Coupons", [
    p("coupons.view", "View coupons"),
    p("coupons.add", "Add coupon"),
    p("coupons.edit", "Edit coupon"),
    p("coupons.delete", "Delete coupon"),
  ]),
  group("flash_deals", "Flash deals", [
    p("flash_deals.view", "View flash deals"),
    p("flash_deals.manage", "Manage flash deals"),
  ]),
  group("marketing", "Marketing", [
    p("popups.view", "View popups"),
    p("popups.manage", "Manage popups"),
    p("alerts.view", "View alerts"),
    p("alerts.manage", "Manage alerts"),
    p("notifications.view", "View notifications"),
    p("notifications.manage", "Manage notifications"),
    p("email_templates.view", "View email templates"),
    p("email_templates.manage", "Manage email templates"),
    p("blog.view", "View blog"),
    p("blog.add", "Add blog post"),
    p("blog.edit", "Edit blog post"),
    p("blog.delete", "Delete blog post"),
    p("newsletter.view", "View newsletter"),
    p("newsletter.manage", "Manage newsletter"),
    p("subscribers.view", "View subscribers"),
    p("subscribers.manage", "Manage subscribers"),
  ]),
  group("marketing_analytics", "Marketing Analytics", [
    p("ga4.view", "View GA4"),
    p("ga4.manage", "Manage GA4"),
    p("gtm.view", "View GTM"),
    p("gtm.manage", "Manage GTM"),
    p("meta.view", "View Meta pixel"),
    p("meta.manage", "Manage Meta pixel"),
    p("merchant.view", "View Merchant Center"),
    p("merchant.manage", "Manage Merchant Center"),
    p("catalog_analytics.view", "View catalog analytics"),
    p("catalog_analytics.manage", "Manage catalog analytics"),
    p("seo.view", "View SEO"),
    p("seo.manage", "Manage SEO"),
    p("sitemap.view", "View sitemap"),
    p("sitemap.manage", "Manage sitemap"),
    p("custom_scripts.view", "View custom scripts"),
    p("custom_scripts.manage", "Manage custom scripts"),
  ]),
  group("reports", "Reports", [
    p("reports.earning", "Earning report"),
    p("reports.product_sale", "Product sale report"),
    p("reports.stock", "Stock report"),
    p("reports.wishlist", "Wishlist report"),
    p("reports.searches", "Search report"),
    p("reports.wallet", "Wallet report"),
    p("reports.compare", "Products compare report"),
  ]),
  group("design_studio", "Design Studio", [
    p("design_studio.view", "View design studio"),
    p("design_studio.manage", "Manage design studio"),
  ]),
  group("media", "Media", [
    p("media.view", "View media"),
    p("media.upload", "Upload media"),
    p("media.delete", "Delete media"),
  ]),
  group("support", "Support & Communication", [
    p("tickets.view", "View tickets"),
    p("tickets.reply", "Reply to tickets"),
    p("tickets.manage", "Manage tickets"),
    p("product_conversations.view", "View product conversations"),
    p("product_conversations.manage", "Manage product conversations"),
    p("contacts.view", "View contacts"),
    p("contacts.manage", "Manage contacts"),
  ]),
  group("payment_gateways", "Payment Gateways", [
    p("payment_methods.view", "View payment methods"),
    p("payment_methods.manage", "Manage payment methods"),
    p("offline_payment.view", "View offline payment"),
    p("offline_payment.manage", "Manage offline payment"),
    p("emi.view", "View EMI settings"),
    p("emi.manage", "Manage EMI settings"),
    p("bkash.view", "View bKash config"),
    p("bkash.manage", "Manage bKash config"),
    p("nagad.view", "View Nagad config"),
    p("nagad.manage", "Manage Nagad config"),
    p("sslcommerz.view", "View SSLCommerz config"),
    p("sslcommerz.manage", "Manage SSLCommerz config"),
  ]),
  group("shipping", "Shipping", [
    p("shipping_method.view", "View shipping methods"),
    p("shipping_method.manage", "Manage shipping methods"),
    p("shipping_config.view", "View shipping configuration"),
    p("shipping_config.manage", "Manage shipping configuration"),
    p("countries.view", "View countries"),
    p("countries.manage", "Manage countries"),
    p("states.view", "View states"),
    p("states.manage", "Manage states"),
    p("cities.view", "View cities"),
    p("cities.manage", "Manage cities"),
    p("areas.view", "View areas"),
    p("areas.manage", "Manage areas"),
    p("zones.view", "View zones"),
    p("zones.manage", "Manage zones"),
    p("carriers.view", "View carriers"),
    p("carriers.manage", "Manage carriers"),
    p("pathao.view", "View Pathao integration"),
    p("pathao.manage", "Manage Pathao integration"),
    p("steadfast.view", "View Steadfast API"),
    p("steadfast.manage", "Manage Steadfast API"),
  ]),
  group("setup", "Setup & Configurations", [
    p("business.view", "View business settings"),
    p("business.manage", "Manage business settings"),
    p("features.view", "View feature activation"),
    p("features.manage", "Manage feature activation"),
    p("languages.view", "View languages"),
    p("languages.manage", "Manage languages"),
    p("currency.view", "View currency"),
    p("currency.manage", "Manage currency"),
    p("smtp.view", "View SMTP"),
    p("smtp.manage", "Manage SMTP"),
    p("filesystem.view", "View filesystem"),
    p("filesystem.manage", "Manage filesystem"),
    p("social_logins.view", "View social logins"),
    p("social_logins.manage", "Manage social logins"),
    p("google_recaptcha.view", "View Google reCAPTCHA"),
    p("google_recaptcha.manage", "Manage Google reCAPTCHA"),
    p("google_map.view", "View Google Map"),
    p("google_map.manage", "Manage Google Map"),
    p("firebase.view", "View Firebase"),
    p("firebase.manage", "Manage Firebase"),
    p("chat_widgets.view", "View chat widgets"),
    p("chat_widgets.manage", "Manage chat widgets"),
    p("comment_system.view", "View comment system"),
    p("comment_system.manage", "Manage comment system"),
  ]),
  group("staff_roles", "Staff & Roles", [
    p("staff.view", "View staff"),
    p("staff.add", "Add staff"),
    p("staff.edit", "Edit staff"),
    p("roles.view", "View roles"),
    p("roles.manage", "Manage role permissions"),
    p("audit.view", "View audit log"),
  ]),
  group("otp_sms", "OTP / SMS", [
    p("otp.view", "View OTP / SMS"),
    p("otp.manage", "Manage OTP / SMS"),
  ]),
];

export function allPermissionIds(): string[] {
  return FEATURE_PERMISSION_GROUPS.flatMap((g) =>
    g.permissions.map((perm) => perm.id),
  );
}

const MANAGER_DENIED = new Set([
  "staff.add",
  "staff.edit",
  "roles.manage",
  "audit.view",
  "custom_scripts.view",
  "custom_scripts.manage",
  "otp.manage",
  "smtp.manage",
  "filesystem.manage",
  "firebase.manage",
  "google_recaptcha.manage",
  "google_map.manage",
  "chat_widgets.manage",
  "comment_system.manage",
  "bkash.manage",
  "nagad.manage",
  "sslcommerz.manage",
  "business.manage",
]);

const SUPPORT_ALLOWED = new Set([
  "dashboard.view",
  "product.view",
  "category.view",
  "brand.view",
  "orders.view_all",
  "orders.view_unpaid",
  "orders.view_details",
  "orders.payment_status",
  "orders.delivery_status",
  "orders.shipping_label",
  "refunds.view",
  "customer.view",
  "tickets.view",
  "tickets.reply",
  "product_conversations.view",
  "product_conversations.manage",
  "contacts.view",
  "contacts.manage",
  "questions.view",
  "questions.answer",
  "reviews.view",
]);

export type StaffRoleRecord = {
  id: string;
  name: string;
  permissionIds: string[];
};

const ALL_IDS = allPermissionIds();

export const MOCK_STAFF_ROLES: StaffRoleRecord[] = [
  {
    id: "role-admin",
    name: "Admin",
    permissionIds: ALL_IDS,
  },
  {
    id: "role-manager",
    name: "Manager",
    permissionIds: ALL_IDS.filter((id) => !MANAGER_DENIED.has(id)),
  },
  {
    id: "role-support",
    name: "Support",
    permissionIds: ALL_IDS.filter((id) => SUPPORT_ALLOWED.has(id)),
  },
];

export function getRoleById(id: string): StaffRoleRecord | null {
  return MOCK_STAFF_ROLES.find((role) => role.id === id) ?? null;
}

export function getRoleByName(name: string): StaffRoleRecord | null {
  return (
    MOCK_STAFF_ROLES.find(
      (role) => role.name.toLowerCase() === name.trim().toLowerCase(),
    ) ?? null
  );
}
