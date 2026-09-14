/**
 * Append-only audit log (P11-T05).
 *
 * Never store passwords, tokens, cookies, or secrets. IP is hashed. A failed
 * write must not block the action that produced the event.
 */
import { hashIp } from "@/lib/auth/session-token";
import { getPrisma } from "@/lib/db/prisma";
import type { ActorType } from "@/lib/generated/prisma/enums";

export const AUDIT_ACTIONS = {
  STAFF_LOGIN: "staff.login",
  STAFF_LOGIN_FAILED: "staff.login_failed",
  STAFF_LOGIN_BLOCKED: "staff.login_blocked",
  STAFF_LOGOUT: "staff.logout",
  STAFF_CREATE: "staff.create",
  STAFF_UPDATE: "staff.update",
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_UPDATE: "customer.update",
  CUSTOMER_BAN: "customer.ban",
  CUSTOMER_UNBAN: "customer.unban",
  CUSTOMER_WALLET_ADJUST: "customer.wallet_adjust",
  B2B_APPLY: "b2b.apply",
  B2B_APPROVE: "b2b.approve",
  B2B_SUSPEND: "b2b.suspend",
  B2B_REACTIVATE: "b2b.reactivate",
  B2B_UPDATE: "b2b.update",
  NOTIFICATION_TYPE_CREATE: "notification_type.create",
  NOTIFICATION_TYPE_UPDATE: "notification_type.update",
  NOTIFICATION_SETTINGS_UPDATE: "notification_settings.update",
  POPUP_CREATE: "popup.create",
  POPUP_UPDATE: "popup.update",
  POPUP_DELETE: "popup.delete",
  VISITOR_WIDGET_SETTINGS_UPDATE: "visitor_widget_settings.update",
  ALERT_CREATE: "alert.create",
  ALERT_UPDATE: "alert.update",
  ALERT_DELETE: "alert.delete",
  SALE_ALERT_SETTINGS_UPDATE: "sale_alert_settings.update",
  EMAIL_TEMPLATE_UPDATE: "email_template.update",
  NEWSLETTER_CAMPAIGN_SEND: "newsletter_campaign.send",
  SMS_CAMPAIGN_SEND: "sms_campaign.send",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  CATEGORY_CREATE: "category.create",
  CATEGORY_UPDATE: "category.update",
  CATEGORY_DELETE: "category.delete",
  BRAND_CREATE: "brand.create",
  BRAND_UPDATE: "brand.update",
  BRAND_DELETE: "brand.delete",
  ATTRIBUTE_CREATE: "attribute.create",
  ATTRIBUTE_UPDATE: "attribute.update",
  ATTRIBUTE_DELETE: "attribute.delete",
  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_CLONE: "product.clone",
  CATEGORY_FEATURED_UPDATE: "category.featured.update",
  CATEGORY_HOT_UPDATE: "category.hot.update",
  PRODUCT_DELETE: "product.delete",
  INVENTORY_UPDATE: "inventory.update",
  REVIEW_CREATE: "review.create",
  REVIEW_MODERATE: "review.moderate",
  REVIEW_DELETE: "review.delete",
  QUESTION_ANSWER: "question.answer",
  QUESTION_DELETE: "question.delete",
  REFUND_REQUEST: "refund.request",
  REFUND_APPROVE: "refund.approve",
  REFUND_REJECT: "refund.reject",
  REFUND_COMPLETE: "refund.complete",
  REFUND_SETTINGS_UPDATE: "refund.settings.update",
  REFUND_REASON_CREATE: "refund.reason.create",
  REFUND_REASON_DELETE: "refund.reason.delete",
  REFUND_REASON_UPDATE: "refund.reason.update",
  ORDER_UPDATE: "order.update",
  /// A sweep cancelled an abandoned checkout and returned its units.
  ORDER_STALE_RELEASE: "order.stale_release",
  MEDIA_UPLOAD: "media.upload",
  MEDIA_UPDATE: "media.update",
  MEDIA_DELETE: "media.delete",
  PC_RULE_UPDATE: "pc_builder.rule.update",
  PC_BUILD_FEATURE: "pc_builder.build.feature",
  PC_BUILDER_SETTINGS_UPDATE: "pc_builder.settings.update",
  PROMOTION_CREATE: "promotion.create",
  PROMOTION_UPDATE: "promotion.update",
  FLASH_SALE_CREATE: "flash_sale.create",
  FLASH_SALE_UPDATE: "flash_sale.update",
  FLASH_SALE_DELETE: "flash_sale.delete",
  DEAL_ASSIGN: "deal.assign",
  DEAL_UNASSIGN: "deal.unassign",
  COUPON_CREATE: "coupon.create",
  COUPON_UPDATE: "coupon.update",
  BLOG_CREATE: "blog.create",
  BLOG_UPDATE: "blog.update",
  BLOG_CATEGORY_CREATE: "blog.category.create",
  BLOG_CATEGORY_UPDATE: "blog.category.update",
  NEWSLETTER_SUBSCRIBE: "newsletter.subscribe",
  NEWSLETTER_STATUS: "newsletter.status",
  NOTIFICATION_SEND: "notification.send",
  NOTIFICATION_DELETE: "notification.delete",
  ANALYTICS_UPDATE: "analytics.update",
  CUSTOM_SCRIPTS_UPDATE: "custom_scripts.update",
  DESIGN_THEME_UPDATE: "design_theme.update",
  CONTENT_PAGE_UPDATE: "content_page.update",
  HOME_BANNER_UPDATE: "home_banner.update",
  HOME_BANNER_DELETE: "home_banner.delete",
  SEO_UPDATE: "seo.update",
  SHIPPING_METHOD_UPDATE: "shipping_method.update",
  SHIPPING_ZONE_UPDATE: "shipping_zone.update",
  SHIPPING_AREA_UPDATE: "shipping_area.update",
  COURIER_SETTING_UPDATE: "courier_setting.update",
  COURIER_ORDER_SENT: "courier_order.sent",
  OTP_SMS_UPDATE: "otp_sms.update",
  SMTP_UPDATE: "smtp.update",
  SOCIAL_LOGIN_UPDATE: "social_login.update",
  RECAPTCHA_UPDATE: "recaptcha.update",
  FIREBASE_UPDATE: "firebase.update",
  BUSINESS_SETTINGS_UPDATE: "business_settings.update",
  STORE_OPERATIONS_SETTINGS_UPDATE: "store_operations_settings.update",
  PROMOTIONAL_PRODUCTS_UPDATE: "promotional_products.update",
  UNIT_CREATE: "unit.create",
  UNIT_UPDATE: "unit.update",
  UNIT_DELETE: "unit.delete",
  NOTE_CREATE: "note.create",
  NOTE_UPDATE: "note.update",
  NOTE_DELETE: "note.delete",
  LABEL_CREATE: "label.create",
  LABEL_UPDATE: "label.update",
  LABEL_DELETE: "label.delete",
  WARRANTY_CREATE: "warranty.create",
  WARRANTY_UPDATE: "warranty.update",
  WARRANTY_DELETE: "warranty.delete",
  CATEGORY_DISCOUNT_UPDATE: "category_discount.update",
  FOOTER_SETTINGS_UPDATE: "footer_settings.update",
  GOOGLE_MAP_UPDATE: "google_map.update",
  CHAT_WIDGET_UPDATE: "chat_widget.update",
  COMMENT_SYSTEM_UPDATE: "comment_system.update",
  PAYMENT_GATEWAY_UPDATE: "payment_gateway.update",
} as const;

const SENSITIVE_KEY = /password|token|secret|cookie|authorization|passwd/i;
const METADATA_MAX_DEPTH = 4;
const METADATA_MAX_STRING = 400;
const DIFF_CAP = 40;

export type AuditWriteInput = {
  actorType: ActorType;
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

export type AuditLogView = {
  id: string;
  createdAt: string;
  actorType: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
};

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (value == null) {
    return null;
  }
  if (depth > METADATA_MAX_DEPTH) {
    return "[truncated]";
  }
  if (typeof value === "string") {
    return value.slice(0, METADATA_MAX_STRING);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, DIFF_CAP)
      .map((item) => sanitizeMetadata(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(key)) {
        continue;
      }
      out[key] = sanitizeMetadata(nested, depth + 1);
    }
    return out;
  }
  return String(value).slice(0, METADATA_MAX_STRING);
}

export function permissionDiff(
  before: readonly string[],
  after: readonly string[],
): { added: string[]; removed: string[] } {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((key) => !beforeSet.has(key)).slice(0, DIFF_CAP),
    removed: before.filter((key) => !afterSet.has(key)).slice(0, DIFF_CAP),
  };
}

export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  try {
    const metadata = input.metadata
      ? (sanitizeMetadata(input.metadata) as object)
      : undefined;
    await getPrisma().auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId?.slice(0, 64) || null,
        actorLabel: input.actorLabel?.trim().slice(0, 120) || null,
        action: input.action.slice(0, 80),
        entityType: input.entityType.slice(0, 80),
        entityId: input.entityId?.slice(0, 64) || null,
        metadata,
        ipHash: hashIp(input.ip),
      },
    });
  } catch (error) {
    console.error(
      "audit write failed",
      error instanceof Error ? error.message : "unknown",
    );
  }
}

export async function listAuditLogs(input: {
  page: number;
  pageSize?: number;
}): Promise<{
  items: AuditLogView[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = input.pageSize ?? 25;
  const page = Math.max(1, input.page);
  const prisma = getPrisma();
  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        actorType: true,
        actorLabel: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
      },
    }),
  ]);

  return {
    page,
    pageSize,
    total,
    items: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      actorType: row.actorType,
      actorLabel: row.actorLabel ?? "—",
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: row.metadata,
    })),
  };
}
