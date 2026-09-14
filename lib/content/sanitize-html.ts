/**
 * Server-side sanitizer for the rich-text blog post body (AD-264). Runs on
 * every save regardless of what the client sent — the real security
 * boundary, not just the editor's own output. Allowlists formatting tags
 * only; strips scripts, event handlers, and any other markup.
 */
import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "u",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "code",
  "pre",
  // Tables: category buying-guide copy is largely price/spec comparisons, and
  // pasted content from a doc or another page arrives as a table too.
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
];

export function sanitizeBlogBody(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "rel", "target"],
      // Span/rowspan only — no style or class, so pasted markup cannot carry
      // its own CSS into the page.
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Internal links stay in the same tab. This copy is written for SEO
      // and is dense with links back into the catalog; forcing every one of
      // them to `target="_blank"` (which this used to do, without looking at
      // the href) throws the visitor a new tab for what should be ordinary
      // navigation. Only links that leave the site get the new tab, and
      // those get `noopener noreferrer` with it.
      a: (tagName, attribs) => {
        const href = (attribs.href ?? "").trim();
        const isInternal =
          href.startsWith("/") || href.startsWith("#") || href === "";
        if (isInternal) {
          const rest = { ...attribs };
          delete rest.target;
          delete rest.rel;
          return { tagName, attribs: rest };
        }
        return {
          tagName,
          attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
        };
      },
    },
  }).trim();
}

/**
 * Elements that are content even with no text of their own. A stray `<br>`
 * is not one of them: a document of nothing but blank lines still renders as
 * nothing, so it should read as empty.
 */
const STRUCTURAL_TAGS = /<(table|hr)[\s>/]/i;

/**
 * True for markup that renders as nothing. An emptied rich-text editor does
 * not hand back `""` — it hands back its empty document, `<p></p>` — and a
 * few stray paragraphs survive a "select all, delete" too.
 */
export function isBlankMarkup(html: string): boolean {
  if (STRUCTURAL_TAGS.test(html)) {
    return false;
  }
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|\u00a0/gi, " ")
      .trim().length === 0
  );
}

/**
 * Sanitize admin-authored rich text for storage. `null` means "nothing
 * worth storing" so the caller can fall back to its built-in copy rather
 * than render an empty panel.
 */
export function sanitizeRichBody(
  html: string,
  options: { maxLength: number; tooLongError: string },
): { ok: true; value: string | null } | { ok: false; formError: string } {
  const clean = sanitizeBlogBody(html ?? "");
  if (clean.length > options.maxLength) {
    return { ok: false, formError: options.tooLongError };
  }
  return { ok: true, value: isBlankMarkup(clean) ? null : clean };
}

/** True if the string contains real markup (not legacy plain text). */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
