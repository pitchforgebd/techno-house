/**
 * `<h1>`–`<h6>` in operator-written HTML → `<div class="th-heading-like
 * th-heading-hN">`, for chrome that is rendered on every page (the marquee
 * notice): a heading there sat in every page's outline (SEO phase 2, B7).
 * The `th-heading-hN` class carries the same `.th-rich-text hN` styles, so
 * it looks the same. Run on already-sanitized HTML only — the sanitizer
 * allows no attributes on headings, so nothing is lost by dropping them.
 */
export function demoteHeadings(html: string): string {
  return html
    .replace(/<h([1-6])(?:\s[^>]*)?>/giu, '<div class="th-heading-like th-heading-h$1">')
    .replace(/<\/h[1-6]\s*>/giu, "</div>");
}
