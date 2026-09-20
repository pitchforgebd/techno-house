"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/format/currency";

export type EmiPlan = { months: number; monthly: number };

/**
 * The monthly-installment breakdown, shown against the EMI figure in the
 * buy box.
 *
 * Opens on hover for a mouse, but it is a real `<button>` with the panel
 * wired to it, so it also opens on keyboard focus and on tap — a
 * hover-only panel is simply unreachable on a phone, which is most of this
 * storefront's traffic.
 */
export function ProductEmiTooltip({
  label,
  plans,
  note,
}: {
  label: string;
  plans: EmiPlan[];
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (plans.length === 0) {
    return null;
  }

  return (
    <span
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        className="text-body font-bold tabular-nums text-text underline decoration-dotted decoration-from-font underline-offset-4 transition-colors hover:text-primary focus-visible:text-primary"
        // Opens rather than toggles: a tap fires mouseenter first on most
        // touch browsers, so toggling here would open it and immediately
        // shut it again. Closing is mouse-leave, tap-outside, or Escape.
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {label}
      </button>

      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 z-20 mb-2 w-60"
        >
          {/* The rounded panel clips its own children, so the pointer is a
              sibling of it — inside, `overflow-hidden` would cut it off. */}
          <span className="block overflow-hidden rounded-md bg-text text-primary-foreground shadow-lg">
            <span className="block border-b border-white/15 px-3 py-2 text-label font-bold">
              Monthly installment (EMI)
            </span>
            {plans.map((plan) => (
              <span
                key={plan.months}
                className="flex items-baseline justify-between gap-3 border-b border-white/10 px-3 py-2 text-label"
              >
                <span className="tabular-nums font-semibold">
                  {formatMoney({ amount: plan.monthly })}
                </span>
                <span className="text-primary-foreground/70">
                  for {plan.months} months
                </span>
              </span>
            ))}
            {note ? (
              <span className="block px-3 py-2 text-caption text-success">
                {note}
              </span>
            ) : null}
          </span>
          <span
            aria-hidden
            className="absolute -bottom-1 left-6 size-3 rotate-45 bg-text"
          />
        </span>
      ) : null}
    </span>
  );
}
