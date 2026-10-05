/**
 * The storefront theme token table.
 *
 * Deliberately its own module with NO database import. `theme-settings.ts`
 * reaches for Prisma, and the admin Appearance screen is a Client Component
 * that needs this table — importing it from there dragged `pg` into the
 * browser bundle and broke the build. Pure data belongs on the client side of
 * that line.
 *
 * This table is the single authority for which CSS variables the storefront
 * theme may touch. The runtime emitter enforces it; the admin screen renders
 * from it; a test asserts every default still matches `app/globals.css`.
 */

/** Fields on `AdminThemeSettings` that drive a storefront CSS variable. */
export type ThemeColorField =
  | "themeBaseColor"
  | "themeAccentColor"
  | "themeBrightColor"
  | "themeSoftColor"
  | "themeTextColor"
  | "themeBackgroundColor"
  | "themeSurfaceColor"
  | "themeBorderColor"
  | "themeOnPrimaryColor"
  | "themeHoverColor"
  | "themeHeaderBgColor"
  | "themeHeaderTextColor"
  | "themeFooterBgColor"
  | "themeFooterTextColor";

export type ThemeColorGroup = "brand" | "surface" | "button" | "chrome";

export type ThemeColorToken = {
  field: ThemeColorField;
  cssVariable: string;
  /** What the operator is choosing, in their words. */
  label: string;
  /** Where it shows up, so the choice is not abstract. */
  description: string;
  group: ThemeColorGroup;
  /**
   * The value compiled into `app/globals.css`, duplicated here so the admin
   * screen can show and restore it.
   *
   * Duplication is a drift risk and is deliberately covered by a test that
   * parses `globals.css` and asserts every value below still matches. The
   * emitter never reads this field — an unset colour is still expressed by
   * emitting nothing, so `globals.css` remains the only thing that decides
   * what an unset token renders as.
   */
  defaultValue: string;
};

export const THEME_COLOR_TOKENS = [
  {
    field: "themeBaseColor",
    cssVariable: "--color-primary",
    label: "Primary",
    description: "Buttons, links and every interactive surface.",
    group: "brand",
    defaultValue: "#0b5ed7",
  },
  {
    field: "themeAccentColor",
    cssVariable: "--color-secondary",
    label: "Secondary",
    description: "The deep ink used for dark panels and strong headings.",
    group: "brand",
    defaultValue: "#051c39",
  },
  {
    field: "themeBrightColor",
    cssVariable: "--color-primary-bright",
    label: "Accent",
    description: "Accents that sit on the dark panels, where Primary is too dim to read.",
    group: "brand",
    defaultValue: "#0a6cff",
  },
  {
    field: "themeSoftColor",
    cssVariable: "--color-primary-soft",
    label: "Soft tint",
    description: "Pale brand wash behind icon tiles and highlighted rows.",
    group: "brand",
    defaultValue: "#e8f0fe",
  },
  {
    field: "themeTextColor",
    cssVariable: "--color-text",
    label: "Body text",
    description: "Default text colour across the storefront.",
    group: "surface",
    defaultValue: "#051c39",
  },
  {
    field: "themeBackgroundColor",
    cssVariable: "--color-background",
    label: "Page background",
    description: "The ground behind every page.",
    group: "surface",
    defaultValue: "#f4f7fb",
  },
  {
    field: "themeSurfaceColor",
    cssVariable: "--color-surface",
    label: "Card surface",
    description: "Cards, panels and form fields.",
    group: "surface",
    defaultValue: "#ffffff",
  },
  {
    field: "themeBorderColor",
    cssVariable: "--color-border",
    label: "Borders",
    description: "Dividers and the outline of cards and inputs.",
    group: "surface",
    defaultValue: "#d6deea",
  },
  {
    field: "themeOnPrimaryColor",
    cssVariable: "--color-primary-foreground",
    label: "Button text",
    description: "Text and icons on a filled primary button.",
    group: "button",
    defaultValue: "#ffffff",
  },
  {
    field: "themeHoverColor",
    cssVariable: "--color-primary-hover",
    label: "Button hover",
    description:
      "Primary button and link background on hover. Keep it dark enough for the button text to stay readable — a pale colour is ignored.",
    group: "button",
    defaultValue: "#0947a8",
  },
  {
    field: "themeHeaderBgColor",
    cssVariable: "--color-header-background",
    label: "Header background",
    description: "The dark band holding the logo, search and top bar.",
    group: "chrome",
    defaultValue: "#051c39",
  },
  {
    field: "themeHeaderTextColor",
    cssVariable: "--color-header-text",
    label: "Header text",
    description: "Logo wordmark, links and icons in the header.",
    group: "chrome",
    defaultValue: "#ffffff",
  },
  {
    field: "themeFooterBgColor",
    cssVariable: "--color-footer-background",
    label: "Footer background",
    description: "The band at the bottom of every page.",
    group: "chrome",
    defaultValue: "#051c39",
  },
  {
    field: "themeFooterTextColor",
    cssVariable: "--color-footer-text",
    label: "Footer text",
    description: "Footer headings, links and contact details.",
    group: "chrome",
    defaultValue: "#ffffff",
  },
] as const satisfies readonly ThemeColorToken[];

/** The admin screen renders from this; the emitter above enforces it. */
export const THEME_COLOR_TOKEN_LIST: readonly ThemeColorToken[] =
  THEME_COLOR_TOKENS;
