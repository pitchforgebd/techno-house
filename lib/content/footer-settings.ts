/**
 * Footer widgets persistence (AD-230).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  defaultFooterWidgetsConfig,
  FOOTER_SOCIAL_NETWORKS,
  type FooterNavColumn,
  type FooterNavLink,
  type FooterSocialItem,
  type FooterSocialNetwork,
  type FooterWidgetsConfig,
} from "@/lib/content/footer-types";
import { getPrisma } from "@/lib/db/prisma";
import { normalizeStorefrontHref } from "@/lib/design/storefront-link";
import { usesDatabase } from "@/lib/runtime/data-source";

export type { FooterWidgetsConfig } from "@/lib/content/footer-types";
export {
  defaultFooterWidgetsConfig,
  formatFooterCopyright,
  FOOTER_SOCIAL_NETWORKS,
} from "@/lib/content/footer-types";

export const FOOTER_DB_REQUIRED =
  "Footer widgets need the database. Remove DATA_SOURCE=mock to save.";

export type FooterMutationResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

export type FooterActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const LABEL_MAX = 80;
const HREF_MAX = 300;
const TEXT_MAX = 1000;
const COLUMN_MAX = 6;
const LINKS_PER_COLUMN_MAX = 20;
const SOCIAL_MAX = 8;
const MARQUEE_TEXT_MAX = 200;

function fail(formError: string): FooterMutationResult {
  return { ok: false, formError };
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeInternalOrHttpHref(raw: string): string | null {
  const href = raw.trim().slice(0, HREF_MAX);
  if (!href) {
    return null;
  }
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes(":")) {
    // Fix the capitals of a link to one of our own pages ("/About" -> "/about"):
    // this runs when the footer is read as well as when it is saved, so a link
    // already stored with the wrong case stops being a dead link without anyone
    // having to edit it (AD-369).
    return normalizeStorefrontHref(href);
  }
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeLink(raw: unknown): FooterNavLink | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const label = String(row.label ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, LABEL_MAX);
  const href = sanitizeInternalOrHttpHref(String(row.href ?? ""));
  if (!label || !href) {
    return null;
  }
  return {
    id: String(row.id ?? "").trim() || newId("link"),
    label,
    href,
  };
}

function sanitizeColumn(raw: unknown): FooterNavColumn | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const title = String(row.title ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, LABEL_MAX);
  if (!title) {
    return null;
  }
  const links = Array.isArray(row.links)
    ? row.links
        .map(sanitizeLink)
        .filter((item): item is FooterNavLink => Boolean(item))
        .slice(0, LINKS_PER_COLUMN_MAX)
    : [];
  return {
    id: String(row.id ?? "").trim() || newId("col"),
    title,
    links,
  };
}

function sanitizeSocial(raw: unknown): FooterSocialItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const network = String(row.network ?? "").trim() as FooterSocialNetwork;
  if (!FOOTER_SOCIAL_NETWORKS.includes(network)) {
    return null;
  }
  const href = sanitizeInternalOrHttpHref(String(row.href ?? ""));
  if (!href) {
    return null;
  }
  return {
    id: String(row.id ?? "").trim() || newId("social"),
    network,
    href,
  };
}

function sanitizePublicPath(raw: string): string {
  const value = raw.trim().slice(0, 300);
  if (!value) {
    return "";
  }
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes(":")) {
    return value;
  }
  return "";
}

export function parseFooterWidgetsConfig(raw: unknown): FooterWidgetsConfig {
  const defaults = defaultFooterWidgetsConfig();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const row = raw as Record<string, unknown>;
  const columns = Array.isArray(row.columns)
    ? row.columns
        .map(sanitizeColumn)
        .filter((item): item is FooterNavColumn => Boolean(item))
        .slice(0, COLUMN_MAX)
    : defaults.columns;
  const socialLinks = Array.isArray(row.socialLinks)
    ? row.socialLinks
        .map(sanitizeSocial)
        .filter((item): item is FooterSocialItem => Boolean(item))
        .slice(0, SOCIAL_MAX)
    : defaults.socialLinks;

  return {
    aboutDescription: String(row.aboutDescription ?? defaults.aboutDescription)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, TEXT_MAX),
    showSocial: row.showSocial !== false,
    socialLinks: socialLinks.length > 0 ? socialLinks : defaults.socialLinks,
    columns: columns.length > 0 ? columns : defaults.columns,
    contactHours: String(row.contactHours ?? defaults.contactHours)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, 120),
    marqueeEnabled: Boolean(row.marqueeEnabled),
    marqueeText: String(row.marqueeText ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, MARQUEE_TEXT_MAX),
    showContactFormLink: row.showContactFormLink !== false,
    showCtaButtons: row.showCtaButtons !== false,
    showNewsletter: row.showNewsletter !== false,
    showTrackForm: row.showTrackForm !== false,
    playStoreEnabled: Boolean(row.playStoreEnabled),
    playStoreUrl:
      sanitizeInternalOrHttpHref(String(row.playStoreUrl ?? "")) ?? "",
    copyrightText: String(row.copyrightText ?? defaults.copyrightText)
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, TEXT_MAX),
    paymentMethodsImageSrc: sanitizePublicPath(
      String(row.paymentMethodsImageSrc ?? ""),
    ),
    subFooterEnabled: Boolean(row.subFooterEnabled),
    subFooterTitle: String(row.subFooterTitle ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, LABEL_MAX),
    subFooterDescription: String(row.subFooterDescription ?? "")
      .replace(/[<>]/g, "")
      .trim()
      .slice(0, TEXT_MAX),
  };
}

export async function getFooterWidgetsConfig(): Promise<FooterWidgetsConfig> {
  if (!usesDatabase()) {
    return defaultFooterWidgetsConfig();
  }
  const row = await getPrisma().footerSettings.findUnique({
    where: { id: "singleton" },
    select: { configJson: true },
  });
  if (!row?.configJson) {
    return defaultFooterWidgetsConfig();
  }
  try {
    return parseFooterWidgetsConfig(JSON.parse(row.configJson));
  } catch {
    return defaultFooterWidgetsConfig();
  }
}

export async function saveFooterWidgetsConfig(input: {
  config: unknown;
  actor?: FooterActor;
}): Promise<FooterMutationResult> {
  if (!usesDatabase()) {
    return fail(FOOTER_DB_REQUIRED);
  }
  const config = parseFooterWidgetsConfig(input.config);
  await getPrisma().footerSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      configJson: JSON.stringify(config),
    },
    update: {
      configJson: JSON.stringify(config),
    },
  });
  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.FOOTER_SETTINGS_UPDATE,
      entityType: "FooterSettings",
      entityId: "singleton",
      metadata: {
        columns: config.columns.length,
        social: config.socialLinks.length,
      },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: "singleton" };
}
