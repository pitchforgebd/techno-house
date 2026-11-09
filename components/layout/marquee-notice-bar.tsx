import { demoteHeadings } from "@/lib/content/demote-headings";

/**
 * Fixed-bottom scrolling notice bar (Design Studio -> Footer widgets ->
 * Marquee notice). Mounted once in the storefront layout, stacked above
 * `MobileBottomNav` inside the same fixed-bottom wrapper so the two never
 * overlap on mobile.
 *
 * A single copy of the text scrolls fully across and off-screen before the
 * next pass starts — no second copy visible at the same time. It starts at
 * `translateX(100vw)` (the bar spans the viewport, so just past its right
 * edge) and ends at `translateX(-100%)` (relative to the span's own width,
 * so fully past the left edge regardless of text length). Transform only —
 * animating `left` counted as layout shift (CLS) on every page; see
 * `.th-marquee-track` in globals.css.
 *
 * `html` is pre-sanitized server-side (`lib/content/sanitize-html.ts`) and
 * safe to render as-is — it only ever allows formatting tags (bold, links),
 * same trust boundary as blog post bodies.
 *
 * SEO phase 2 (B7): the bar is a `role="note"` and any heading the operator
 * typed into the notice (the live "under development" text is an <h3>) is
 * rendered as a styled <div> — same look, but no longer a heading in every
 * page's outline. The notice text itself is unchanged.
 */
export function MarqueeNoticeBar({
  html,
  speedSeconds,
}: {
  html: string;
  speedSeconds: number;
}) {
  return (
    <div
      role="note"
      className="relative h-11 shrink-0 overflow-hidden border-t border-primary/25 bg-surface shadow-[0_-4px_12px_-6px_rgba(14,26,36,0.15)]"
    >
      <span
        className="th-marquee-track th-rich-text absolute inset-y-0 flex items-center whitespace-nowrap text-label font-medium text-text [&_p]:inline [&_p]:m-0"
        style={{ animationDuration: `${speedSeconds}s` }}
        dangerouslySetInnerHTML={{ __html: demoteHeadings(html) }}
      />
    </div>
  );
}
