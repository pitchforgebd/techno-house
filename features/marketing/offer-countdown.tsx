"use client";

import { useEffect, useState } from "react";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function computeRemaining(endsAtIso: string): Remaining {
  const diffMs = Math.max(0, new Date(endsAtIso).getTime() - Date.now());
  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * Live days/hrs/min/sec countdown to a real end date — ticks every second on
 * the client. Server-rendered as the zeroed placeholder (the real value
 * depends on the visitor's own clock at the moment of load, which the server
 * can't know); the real countdown takes over on mount, same pattern as the
 * other client-only-value components on this storefront (e.g. the PC
 * Builder lightbox's append-mode read).
 */
export function OfferCountdown({ endsAtIso }: { endsAtIso: string | null }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!endsAtIso) {
      return;
    }
    setRemaining(computeRemaining(endsAtIso));
    const id = setInterval(() => {
      setRemaining(computeRemaining(endsAtIso));
    }, 1000);
    return () => clearInterval(id);
  }, [endsAtIso]);

  if (!endsAtIso) {
    return null;
  }

  const display = remaining ?? { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const cells: [string, number][] = [
    ["DAY", display.days],
    ["HRS", display.hours],
    ["MIN", display.minutes],
    ["SEC", display.seconds],
  ];

  return (
    <div
      className="grid grid-cols-4 gap-1.5"
      role="timer"
      aria-label="Offer ends in"
    >
      {cells.map(([label, value]) => (
        <div
          key={label}
          className="rounded-md border border-border bg-surface-muted/60 py-1.5 text-center"
        >
          <p className="text-label font-bold tabular-nums text-text">
            {pad(value)}
          </p>
          <p className="text-[0.6rem] font-medium uppercase tracking-wide text-text-muted">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
