/**
 * Duotone line icons for the homepage "Top categories" strip.
 *
 * Hand-drawn on a 48×48 grid instead of lucide, because lucide is
 * single-stroke only and this row needs the two-tone look: a dark outline
 * plus one solid accent shape per icon. Colours come from tokens
 * (`currentColor` for the outline, `fill-primary` / `fill-surface` for the
 * accent) — see docs/DESIGN_SYSTEM.md, no hex values in components.
 */
import { cn } from "@/lib/cn";

export type TopCategoryIconProps = { className?: string };

const BASE = "size-11 text-text";

function Svg({
  className,
  children,
}: TopCategoryIconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn(BASE, className)}
    >
      {children}
    </svg>
  );
}

export function IconTopLaptop({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="23" y="14" width="14" height="13" rx="1" className="fill-primary" stroke="none" />
      <rect x="9" y="10" width="30" height="21" rx="2" />
      <path d="M5 35h38l-2.5 4h-33z" />
    </Svg>
  );
}

export function IconTopProcessor({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="17" y="17" width="14" height="14" rx="2" className="fill-primary" stroke="none" />
      <rect x="12" y="12" width="24" height="24" rx="3" />
      <rect x="17" y="17" width="14" height="14" rx="2" />
      <path d="M18 12V7M24 12V7M30 12V7M18 41v-5M24 41v-5M30 41v-5M12 18H7M12 24H7M12 30H7M41 18h-5M41 24h-5M41 30h-5" />
    </Svg>
  );
}

export function IconTopMobile({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="18" y="11" width="12" height="24" className="fill-primary" stroke="none" />
      <rect x="15" y="5" width="18" height="38" rx="3" />
      <rect x="18" y="11" width="12" height="24" />
      <path d="M21.5 8h5" />
      <circle cx="24" cy="39" r="1.6" className="fill-current" stroke="none" />
    </Svg>
  );
}

export function IconTopSpeaker({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <path d="M16.5 9h6v30h-6z" className="fill-primary" stroke="none" />
      <rect x="13" y="5" width="22" height="38" rx="3" />
      <circle cx="29" cy="31" r="5.5" className="fill-surface" />
      <circle cx="29" cy="31" r="1.6" className="fill-current" stroke="none" />
      <circle cx="29" cy="14" r="2.6" className="fill-surface" />
    </Svg>
  );
}

export function IconTopAc({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="14" width="18" height="9" className="fill-primary" stroke="none" />
      <rect x="6" y="11" width="36" height="18" rx="3" />
      <path d="M6 24h36" />
      <circle cx="35" cy="17.5" r="3.5" className="fill-surface" />
      <path d="M13 33c2.5 0 2.5 4 5 4M23 33c2.5 0 2.5 4 5 4M33 33c2.5 0 2.5 4 5 4" />
    </Svg>
  );
}

export function IconTopTv({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="12" width="30" height="17" className="fill-primary" stroke="none" />
      <rect x="6" y="9" width="36" height="23" rx="3" />
      <path d="M19 22a7 7 0 0 1 10 0M22 26a3 3 0 0 1 4 0" />
      <path d="M18 38h12M24 32v6" />
    </Svg>
  );
}

export function IconTopGaming({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M18 18h6v13h-5.5L16.9 33.3C15.9 35 14 36 12 36c-3.3 0-6-2.7-6-6 0-6.6 5.4-12 12-12z"
        className="fill-primary"
        stroke="none"
      />
      <path d="M18 18h12c6.6 0 12 5.4 12 12 0 3.3-2.7 6-6 6-2 0-3.9-1-5-2.7L29.5 31h-11L16.9 33.3C15.9 35 14 36 12 36c-3.3 0-6-2.7-6-6 0-6.6 5.4-12 12-12z" />
      <path d="M16 23v6M13 26h6" />
      <circle cx="31.5" cy="24.5" r="2" className="fill-current" stroke="none" />
      <circle cx="35.5" cy="28.5" r="2" className="fill-current" stroke="none" />
    </Svg>
  );
}

export function IconTopPrinter({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="19" width="19" height="11" className="fill-primary" stroke="none" />
      <path d="M15 18V7h18v11" />
      <rect x="6" y="18" width="36" height="13" rx="2" />
      <path d="M15 31h18v10H15z" className="fill-surface" />
      <path d="M31 22h5M31 26h5" />
    </Svg>
  );
}

export function IconTopGpu({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="17" width="31" height="14" className="fill-primary" stroke="none" />
      <rect x="6" y="14" width="36" height="20" rx="2" />
      <circle cx="17" cy="24" r="5" className="fill-surface" />
      <circle cx="31" cy="24" r="5" className="fill-surface" />
      <path d="M17 21v6M14 24h6M31 21v6M28 24h6" />
      <path d="M13 34v4M20 34v4M27 34v4M34 34v4" />
    </Svg>
  );
}

export function IconTopCamera({ className }: TopCategoryIconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="18" width="12" height="15" className="fill-primary" stroke="none" />
      <path d="M18 14h9l2 4" />
      <rect x="6" y="15" width="36" height="21" rx="3" />
      <circle cx="29" cy="26" r="7" className="fill-surface" />
      <circle cx="29" cy="26" r="3" />
      <circle cx="12" cy="21" r="1.4" className="fill-current" stroke="none" />
    </Svg>
  );
}
