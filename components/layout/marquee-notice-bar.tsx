/**
 * Fixed-bottom scrolling notice bar (Design Studio -> Footer widgets ->
 * Marquee notice). Mounted once in the storefront layout, stacked above
 * `MobileBottomNav` inside the same fixed-bottom wrapper so the two never
 * overlap on mobile.
 *
 * The track renders the text twice back to back and animates translateX to
 * exactly -50% (see `.th-marquee-track` in globals.css) — a seamless loop
 * with no visible seam, regardless of how long the text is. The duplicate
 * copy is `aria-hidden` so screen readers announce the notice once.
 */
export function MarqueeNoticeBar({ text }: { text: string }) {
  return (
    <div
      role="status"
      className="h-11 shrink-0 overflow-hidden border-t border-primary/25 bg-surface shadow-[0_-4px_12px_-6px_rgba(14,26,36,0.15)]"
    >
      <div className="flex h-full w-max items-center th-marquee-track">
        <span className="flex shrink-0 items-center whitespace-nowrap pr-16 text-label font-medium text-text">
          {text}
        </span>
        <span
          aria-hidden
          className="flex shrink-0 items-center whitespace-nowrap pr-16 text-label font-medium text-text"
        >
          {text}
        </span>
      </div>
    </div>
  );
}
