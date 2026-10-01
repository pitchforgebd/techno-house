/**
 * Fixed-bottom scrolling notice bar (Design Studio -> Footer widgets ->
 * Marquee notice). Mounted once in the storefront layout, stacked above
 * `MobileBottomNav` inside the same fixed-bottom wrapper so the two never
 * overlap on mobile.
 *
 * A single copy of the text scrolls fully across and off-screen before the
 * next pass starts — no second copy visible at the same time. `left: 100%`
 * (relative to this `relative` container) places it just past the right
 * edge regardless of container width, and `translateX(-100%)` at the end
 * (relative to the span's own width) pushes it fully past the left edge
 * regardless of text length — see `.th-marquee-track` in globals.css.
 */
export function MarqueeNoticeBar({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="relative h-11 shrink-0 overflow-hidden border-t border-primary/25 bg-surface shadow-[0_-4px_12px_-6px_rgba(14,26,36,0.15)]"
    >
      <span className="absolute inset-y-0 flex items-center whitespace-nowrap text-label font-medium text-text th-marquee-track">
        {text}
      </span>
    </div>
  );
}
