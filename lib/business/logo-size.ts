/**
 * Rendered logo height, in CSS pixels.
 *
 * Only the height is configurable: width follows the artwork's own aspect
 * ratio via `width: auto`, so asking an admin for both would let them squash
 * their own logo. The max-width cap scales with the height for the same
 * reason — a fixed cap would silently shrink a wide logo below the height
 * that was asked for, which looks like the setting being ignored.
 *
 * No imports here: client components read these too.
 */
export const LOGO_HEIGHT_MIN = 16;
export const LOGO_HEIGHT_MAX = 96;
export const LOGO_HEIGHT_DEFAULT = 32;

export function clampLogoHeight(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return LOGO_HEIGHT_DEFAULT;
  }
  return Math.min(
    LOGO_HEIGHT_MAX,
    Math.max(LOGO_HEIGHT_MIN, Math.round(value)),
  );
}

/** Inline style for a chrome logo at the configured height. */
export function logoStyle(heightPx: number): {
  height: string;
  width: string;
  maxWidth: string;
} {
  const h = clampLogoHeight(heightPx);
  return { height: `${h}px`, width: "auto", maxWidth: `${h * 9}px` };
}
