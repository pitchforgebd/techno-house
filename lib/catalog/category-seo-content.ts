/**
 * Admin-managed buying-guide copy shown at the bottom of a category page.
 *
 * Server only. Stored as sanitized HTML (same allowlist as blog bodies, plus
 * tables) so an admin can paste formatted content, add headings, backlinks,
 * and comparison tables. When a category has nothing saved the page keeps
 * showing the built-in copy from `category-page-content.ts`, so switching a
 * category to admin-managed text is opt-in rather than a blank page.
 *
 * Writing goes through `saveAdminCategory` (see `admin-categories.ts`) so the
 * description saves with the rest of the category in one update and one audit
 * entry — this module only owns reading and cleaning.
 */
import {
  sanitizeBlogBody,
  sanitizeRichBody,
} from "@/lib/content/sanitize-html";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

/** Roughly 12–15 printed pages — far more than a buying guide needs. */
export const CATEGORY_SEO_HTML_MAX = 60_000;

export async function getCategorySeoHtml(slug: string): Promise<string> {
  if (!usesDatabase()) {
    return "";
  }
  const row = await getPrisma().category.findUnique({
    where: { slug },
    select: { seoContentHtml: true },
  });
  // Sanitized again at read time — stored HTML is never trusted just
  // because it was clean when it was saved.
  return row?.seoContentHtml ? sanitizeBlogBody(row.seoContentHtml) : "";
}

/**
 * Strips everything outside the allowlist and enforces the size cap.
 * Returns `null` for empty content so the category falls back to the
 * built-in copy rather than rendering an empty panel.
 */
export function sanitizeCategorySeoHtml(
  html: string,
): { ok: true; value: string | null } | { ok: false; formError: string } {
  return sanitizeRichBody(html, {
    maxLength: CATEGORY_SEO_HTML_MAX,
    tooLongError: "That category description is too long.",
  });
}
