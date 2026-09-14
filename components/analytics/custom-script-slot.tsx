/**
 * Renders raw admin-supplied <script> markup verbatim into the page's own
 * server-rendered HTML (AD-269) — the browser parses and executes it exactly
 * like any other inline <script> in the document, no client-side DOM surgery
 * needed. Content is trusted by design (Admin-only, see lib/analytics/custom-scripts.ts).
 */
export function CustomScriptSlot({ html }: { html: string }) {
  if (!html.trim()) {
    return null;
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
