/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * Exists for one job: the Appearance screen lets an operator set the brand
 * palette, and the most likely way to damage the storefront with it is not a
 * security failure but an ordinary one — picking a pale primary, which turns
 * every white-on-primary button into unreadable text. Nothing in the stack
 * would notice, because a low-contrast page is a perfectly valid page.
 *
 * The screen warns rather than blocks. A brand is the operator's decision and
 * a hard limit would be wrong, but "you cannot read this" should not be a
 * discovery they make from a customer complaint.
 *
 * Pure, so the arithmetic is testable without rendering anything.
 *
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Matches the storage format exactly — `#rrggbb`, nothing else. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** WCAG AA for normal-size body text. */
export const AA_NORMAL_TEXT = 4.5;
/** WCAG AA for large text, and the floor for icons and other graphics. */
export const AA_LARGE_TEXT = 3;

function channelLuminance(channel: number): number {
  const c = channel / 255;
  // The 0.03928 knee is from the spec: sRGB is roughly linear near black and
  // gamma-encoded above, so a single power curve would misjudge dark colours.
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance, 0 (black) to 1 (white). Null for a malformed colour. */
export function relativeLuminance(hex: string): number | null {
  if (!HEX_COLOR.test(hex)) {
    return null;
  }
  const value = Number.parseInt(hex.slice(1), 16);
  const r = channelLuminance((value >> 16) & 0xff);
  const g = channelLuminance((value >> 8) & 0xff);
  const b = channelLuminance(value & 0xff);
  // The green coefficient dominates because human vision is most sensitive
  // there — which is why two colours of equal "brightness" by eye can have
  // very different luminance.
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two colours, 1 (identical) to 21 (black on white).
 *
 * Order-independent by construction: the lighter colour always ends up on top
 * of the fraction, so `contrastRatio(a, b)` and `contrastRatio(b, a)` agree.
 * Returns null if either colour is malformed, so a half-typed hex in an input
 * produces no warning rather than a wrong one.
 */
export function contrastRatio(
  foreground: string,
  background: string,
): number | null {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  if (a === null || b === null) {
    return null;
  }
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastVerdict = {
  ratio: number;
  /** Passes AA for body text. */
  passesText: boolean;
  /** Passes AA for large text, icons and other graphics. */
  passesLarge: boolean;
  label: string;
};

/** A ratio plus the wording the admin screen shows. Null for bad input. */
export function judgeContrast(
  foreground: string,
  background: string,
): ContrastVerdict | null {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) {
    return null;
  }
  // Rounded down, never up: a value displayed as 4.5 must actually clear 4.5.
  const shown = Math.floor(ratio * 100) / 100;
  const passesText = ratio >= AA_NORMAL_TEXT;
  const passesLarge = ratio >= AA_LARGE_TEXT;
  return {
    ratio: shown,
    passesText,
    passesLarge,
    label: passesText
      ? `${shown}:1 — passes AA`
      : passesLarge
        ? `${shown}:1 — large text only, below AA for body text`
        : `${shown}:1 — fails AA, hard to read`,
  };
}
