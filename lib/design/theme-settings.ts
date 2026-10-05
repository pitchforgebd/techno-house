/**
 * Design Studio theme settings (AD-272) — real storefront brand colors,
 * body/heading font, auth-page colors, and admin-navbar colors.
 *
 * Colors are plain hex strings (never trusted as raw CSS — validated with a
 * strict `#rrggbb` regex before save, so nothing here can inject arbitrary
 * CSS/HTML when interpolated into a `<style>` tag). Fonts are a fixed
 * pre-loaded whitelist (next/font requires static imports), not arbitrary
 * font names.
 */
import { cache } from "react";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { isHoverUnreadable } from "@/lib/design/contrast";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

export const THEME_DB_REQUIRED =
  "Design Studio settings need the database. Turn off DATA_SOURCE=mock to save.";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const FONT_CHOICES = ["inter", "noto-bengali", "system-ui"] as const;
export type FontChoice = (typeof FONT_CHOICES)[number] | "";

const FONT_VAR: Record<Exclude<FontChoice, "">, string> = {
  inter: "var(--font-inter)",
  "noto-bengali": "var(--font-noto-bengali)",
  "system-ui": 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
};

export type AdminThemeSettings = {
  themeBaseColor: string;
  themeAccentColor: string;
  themeHoverColor: string;
  themeSoftColor: string;
  themeTextColor: string;
  themeBackgroundColor: string;
  themeSurfaceColor: string;
  themeBorderColor: string;
  themeBrightColor: string;
  themeOnPrimaryColor: string;
  themeHeaderBgColor: string;
  themeHeaderTextColor: string;
  themeFooterBgColor: string;
  themeFooterTextColor: string;
  watermarkEnabled: boolean;
  watermarkType: string;
  watermarkImageSrc: string;
  watermarkPosition: string;
  bodyFont: FontChoice;
  headingFont: FontChoice;
  authBgColor: string;
  authPanelColor: string;
  authIllustrationSrc: string;
  adminNavBgColor: string;
  adminNavTextColor: string;
};

export type ThemeMutationResult = { ok: true } | { ok: false; formError: string };

export type ThemeActor = { staffId: string; email: string; ip?: string | null };

const EMPTY: AdminThemeSettings = {
  themeBaseColor: "",
  themeAccentColor: "",
  themeHoverColor: "",
  themeSoftColor: "",
  themeTextColor: "",
  themeBackgroundColor: "",
  themeSurfaceColor: "",
  themeBorderColor: "",
  themeBrightColor: "",
  themeOnPrimaryColor: "",
  themeHeaderBgColor: "",
  themeHeaderTextColor: "",
  themeFooterBgColor: "",
  themeFooterTextColor: "",
  watermarkEnabled: false,
  watermarkType: "image",
  watermarkImageSrc: "",
  watermarkPosition: "",
  bodyFont: "",
  headingFont: "",
  authBgColor: "",
  authPanelColor: "",
  authIllustrationSrc: "",
  adminNavBgColor: "",
  adminNavTextColor: "",
};

function fail(formError: string): ThemeMutationResult {
  return { ok: false, formError };
}

function isFontChoice(value: string): value is FontChoice {
  return value === "" || (FONT_CHOICES as readonly string[]).includes(value);
}

/**
 * Theme settings for this request.
 *
 * Wrapped in React `cache()` because six call sites read it and the storefront
 * layout is one of them, so an uncached read meant a database round trip on
 * every page render. `cache()` is request-scoped only: an admin save is
 * visible on the very next request, which is the whole point of a theme an
 * operator can change without a deploy. Nothing here is cached across
 * requests.
 */
export const getAdminThemeSettings = cache(async (): Promise<AdminThemeSettings> => {
  if (!usesDatabase()) {
    return EMPTY;
  }
  const row = await getPrisma().designThemeSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return EMPTY;
  }
  return {
    themeBaseColor: row.themeBaseColor ?? "",
    themeAccentColor: row.themeAccentColor ?? "",
    themeHoverColor: row.themeHoverColor ?? "",
    themeSoftColor: row.themeSoftColor ?? "",
    themeTextColor: row.themeTextColor ?? "",
    themeBackgroundColor: row.themeBackgroundColor ?? "",
    themeSurfaceColor: row.themeSurfaceColor ?? "",
    themeBorderColor: row.themeBorderColor ?? "",
    themeBrightColor: row.themeBrightColor ?? "",
    themeOnPrimaryColor: row.themeOnPrimaryColor ?? "",
    themeHeaderBgColor: row.themeHeaderBgColor ?? "",
    themeHeaderTextColor: row.themeHeaderTextColor ?? "",
    themeFooterBgColor: row.themeFooterBgColor ?? "",
    themeFooterTextColor: row.themeFooterTextColor ?? "",
    watermarkEnabled: row.watermarkEnabled,
    watermarkType: row.watermarkType,
    watermarkImageSrc: row.watermarkImageSrc ?? "",
    watermarkPosition: row.watermarkPosition ?? "",
    bodyFont: isFontChoice(row.bodyFont ?? "") ? ((row.bodyFont ?? "") as FontChoice) : "",
    headingFont: isFontChoice(row.headingFont ?? "") ? ((row.headingFont ?? "") as FontChoice) : "",
    authBgColor: row.authBgColor ?? "",
    authPanelColor: row.authPanelColor ?? "",
    authIllustrationSrc: row.authIllustrationSrc ?? "",
    adminNavBgColor: row.adminNavBgColor ?? "",
    adminNavTextColor: row.adminNavTextColor ?? "",
  };
});

/**
 * A colour the caller did not mention stays exactly as it is.
 *
 * `undefined` means "not part of this request" and becomes `undefined` in the
 * Prisma payload, which Prisma treats as "leave this column alone". An empty
 * string means "clear it", which becomes `null` and returns the token to its
 * built-in default. The two are deliberately different: a save form that
 * submits only some fields must not silently reset the rest.
 */
function colorPatch(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value || null;
}

export type AppearanceColorInput = {
  themeBaseColor: string;
  themeAccentColor: string;
  themeHoverColor: string;
  themeSoftColor: string;
  /**
   * Added in phase 2. Optional so the existing Appearance form, which submits
   * only the four above, keeps working unchanged and untouched.
   */
  themeTextColor?: string;
  themeBackgroundColor?: string;
  themeSurfaceColor?: string;
  themeBorderColor?: string;
  themeBrightColor?: string;
  themeOnPrimaryColor?: string;
  themeHeaderBgColor?: string;
  themeHeaderTextColor?: string;
  themeFooterBgColor?: string;
  themeFooterTextColor?: string;
};

export async function saveAppearanceSettings(
  input: AppearanceColorInput & { actor?: ThemeActor },
): Promise<ThemeMutationResult> {
  if (!usesDatabase()) {
    return fail(THEME_DB_REQUIRED);
  }
  // Labels are what the operator sees, so they name the thing on screen rather
  // than the column. Validation is identical for every colour — the same
  // `#rrggbb` rule the runtime emitter re-checks before anything is rendered.
  for (const [label, value] of [
    ["Base color", input.themeBaseColor],
    ["Accent color", input.themeAccentColor],
    ["Hover color", input.themeHoverColor],
    ["Soft background", input.themeSoftColor],
    ["Text color", input.themeTextColor],
    ["Background color", input.themeBackgroundColor],
    ["Surface color", input.themeSurfaceColor],
    ["Border color", input.themeBorderColor],
    ["Bright accent color", input.themeBrightColor],
    ["Button text color", input.themeOnPrimaryColor],
    ["Header background", input.themeHeaderBgColor],
    ["Header text color", input.themeHeaderTextColor],
    ["Footer background", input.themeFooterBgColor],
    ["Footer text color", input.themeFooterTextColor],
  ] as const) {
    if (value && !HEX_COLOR.test(value)) {
      return fail(`${label} must be a hex color like #125e6a.`);
    }
  }

  const colors = {
    themeBaseColor: colorPatch(input.themeBaseColor),
    themeAccentColor: colorPatch(input.themeAccentColor),
    themeHoverColor: colorPatch(input.themeHoverColor),
    themeSoftColor: colorPatch(input.themeSoftColor),
    themeTextColor: colorPatch(input.themeTextColor),
    themeBackgroundColor: colorPatch(input.themeBackgroundColor),
    themeSurfaceColor: colorPatch(input.themeSurfaceColor),
    themeBorderColor: colorPatch(input.themeBorderColor),
    themeBrightColor: colorPatch(input.themeBrightColor),
    themeOnPrimaryColor: colorPatch(input.themeOnPrimaryColor),
    themeHeaderBgColor: colorPatch(input.themeHeaderBgColor),
    themeHeaderTextColor: colorPatch(input.themeHeaderTextColor),
    themeFooterBgColor: colorPatch(input.themeFooterBgColor),
    themeFooterTextColor: colorPatch(input.themeFooterTextColor),
  };

  await getPrisma().designThemeSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...colors },
    update: colors,
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.DESIGN_THEME_UPDATE,
      entityType: "DesignThemeSettings",
      entityId: "singleton",
      ip: input.actor.ip,
      metadata: { section: "appearance" },
    });
  }
  return { ok: true };
}

export async function saveWatermarkSettings(input: {
  enabled: boolean;
  type: string;
  imageSrc: string;
  position: string;
  actor?: ThemeActor;
}): Promise<ThemeMutationResult> {
  if (!usesDatabase()) {
    return fail(THEME_DB_REQUIRED);
  }
  const type = input.type === "text" ? "text" : "image";

  await getPrisma().designThemeSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      watermarkEnabled: input.enabled,
      watermarkType: type,
      watermarkImageSrc: input.imageSrc || null,
      watermarkPosition: input.position || null,
    },
    update: {
      watermarkEnabled: input.enabled,
      watermarkType: type,
      watermarkImageSrc: input.imageSrc || null,
      watermarkPosition: input.position || null,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.DESIGN_THEME_UPDATE,
      entityType: "DesignThemeSettings",
      entityId: "singleton",
      ip: input.actor.ip,
      metadata: { section: "watermark", enabled: input.enabled },
    });
  }
  return { ok: true };
}

export async function saveTypographySettings(input: {
  bodyFont: string;
  headingFont: string;
  actor?: ThemeActor;
}): Promise<ThemeMutationResult> {
  if (!usesDatabase()) {
    return fail(THEME_DB_REQUIRED);
  }
  if (!isFontChoice(input.bodyFont) || !isFontChoice(input.headingFont)) {
    return fail("Choose one of the listed fonts.");
  }

  await getPrisma().designThemeSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      bodyFont: input.bodyFont || null,
      headingFont: input.headingFont || null,
    },
    update: {
      bodyFont: input.bodyFont || null,
      headingFont: input.headingFont || null,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.DESIGN_THEME_UPDATE,
      entityType: "DesignThemeSettings",
      entityId: "singleton",
      ip: input.actor.ip,
      metadata: { section: "typography", bodyFont: input.bodyFont, headingFont: input.headingFont },
    });
  }
  return { ok: true };
}

export async function saveAuthPageSettings(input: {
  bgColor: string;
  panelColor: string;
  illustrationSrc: string;
  actor?: ThemeActor;
}): Promise<ThemeMutationResult> {
  if (!usesDatabase()) {
    return fail(THEME_DB_REQUIRED);
  }
  for (const [label, value] of [
    ["Page background", input.bgColor],
    ["Form panel", input.panelColor],
  ] as const) {
    if (value && !HEX_COLOR.test(value)) {
      return fail(`${label} must be a hex color like #125e6a.`);
    }
  }

  await getPrisma().designThemeSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      authBgColor: input.bgColor || null,
      authPanelColor: input.panelColor || null,
      authIllustrationSrc: input.illustrationSrc || null,
    },
    update: {
      authBgColor: input.bgColor || null,
      authPanelColor: input.panelColor || null,
      authIllustrationSrc: input.illustrationSrc || null,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.DESIGN_THEME_UPDATE,
      entityType: "DesignThemeSettings",
      entityId: "singleton",
      ip: input.actor.ip,
      metadata: { section: "auth" },
    });
  }
  return { ok: true };
}

export async function saveAdminNavSettings(input: {
  bgColor: string;
  textColor: string;
  actor?: ThemeActor;
}): Promise<ThemeMutationResult> {
  if (!usesDatabase()) {
    return fail(THEME_DB_REQUIRED);
  }
  for (const [label, value] of [
    ["Navbar background", input.bgColor],
    ["Navbar text", input.textColor],
  ] as const) {
    if (value && !HEX_COLOR.test(value)) {
      return fail(`${label} must be a hex color like #125e6a.`);
    }
  }

  await getPrisma().designThemeSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      adminNavBgColor: input.bgColor || null,
      adminNavTextColor: input.textColor || null,
    },
    update: {
      adminNavBgColor: input.bgColor || null,
      adminNavTextColor: input.textColor || null,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.DESIGN_THEME_UPDATE,
      entityType: "DesignThemeSettings",
      entityId: "singleton",
      ip: input.actor.ip,
      metadata: { section: "admin-nav" },
    });
  }
  return { ok: true };
}

/**
 * Which stored setting may drive which CSS variable. Nothing else can.
 *
 * The emitter below is a serialization boundary, not a CSS generator. Property
 * names come from THIS table and never from the database, so no stored value
 * can introduce a declaration, a selector, or a second property — only supply
 * the value for a variable that was already decided here.
 *
 * Adding a token is a deliberate edit to this list. That is the intended
 * friction: a future settings column cannot become a CSS variable by accident.
 */
/**
 * The allow-list lives in `theme-tokens.ts` — a module with no database
 * import, so the admin Appearance screen (a Client Component) can render from
 * the same table the emitter enforces without pulling Prisma into the browser
 * bundle.
 *
 * Indexing `settings[token.field]` below is also the compile-time check that
 * every name in that table is a real key of `AdminThemeSettings`.
 */
import { THEME_COLOR_TOKENS } from "@/lib/design/theme-tokens";

export {
  THEME_COLOR_TOKEN_LIST,
  type ThemeColorField,
  type ThemeColorGroup,
  type ThemeColorToken,
} from "@/lib/design/theme-tokens";


const THEME_FONT_TOKENS = [
  { field: "bodyFont", cssVariable: "--font-sans" },
  { field: "headingFont", cssVariable: "--font-heading" },
] as const satisfies readonly {
  field: keyof AdminThemeSettings;
  cssVariable: string;
}[];

/**
 * Builds the `:root` override block. Pure, so the security properties below
 * can be tested without a database.
 *
 * ## Why values are validated again here
 *
 * `saveAppearanceSettings` already rejects anything that is not `#rrggbb`, and
 * that is the right place for a good error message — but it is validation at
 * the *write*, and this function is the *read*. A row edited directly in psql,
 * restored from an older backup, or written by some future code path has never
 * passed through that check. Validating at the point of emission is what makes
 * "a corrupt database value cannot reach the page" true rather than merely
 * likely.
 *
 * ## What an invalid value does
 *
 * The line is omitted. That is not a silent swallow: omitting the override is
 * exactly how this file already expresses "use the default", because the
 * built-in value in `app/globals.css` then applies unchanged. Substituting a
 * hardcoded fallback here would duplicate those defaults in a second place and
 * let the two drift.
 *
 * ## A hover colour the button text cannot be read on (AD-366)
 *
 * "Button hover" is the background of every primary button on hover, and the
 * middle of the header PC Builder button's gradient, so it has to keep the
 * button's label readable. A valid `#rrggbb` that does not — the live theme had
 * #f9fafb, 1.04:1 against white text — is omitted like an invalid one: the
 * default hover applies instead, and the Appearance screen says so. Only the
 * plainly unreadable case (below 3:1) is dropped; a low-but-legible hover is the
 * operator's call and is emitted. The label colour is the operator's "Button
 * text" if set, else its default, so a pale hover with dark button text is fine.
 *
 * Fonts are not pattern-matched because the database never supplies a font
 * value — it supplies a KEY, which `FONT_VAR` turns into a constant from this
 * module. `isFontChoice` re-checks that the key is one of the three known
 * ones, so an unrecognised key selects nothing rather than indexing into
 * `undefined`.
 */
export function buildStorefrontThemeCss(settings: AdminThemeSettings): string {
  const lines: string[] = [];

  const onPrimary = settings.themeOnPrimaryColor;
  const buttonText =
    typeof onPrimary === "string" && HEX_COLOR.test(onPrimary)
      ? onPrimary
      : (THEME_COLOR_TOKENS.find((token) => token.field === "themeOnPrimaryColor")
          ?.defaultValue ?? "#ffffff");

  for (const token of THEME_COLOR_TOKENS) {
    const stored = settings[token.field];
    if (typeof stored === "string" && HEX_COLOR.test(stored)) {
      if (
        token.field === "themeHoverColor" &&
        isHoverUnreadable(buttonText, stored)
      ) {
        continue;
      }
      lines.push(`${token.cssVariable}: ${stored};`);
    }
  }

  for (const token of THEME_FONT_TOKENS) {
    const choice = settings[token.field];
    if (typeof choice === "string" && choice !== "" && isFontChoice(choice)) {
      lines.push(`${token.cssVariable}: ${FONT_VAR[choice]};`);
    }
  }

  if (lines.length === 0) {
    return "";
  }
  return `:root{${lines.join("")}}`;
}

/** Real `:root` CSS variable overrides for the storefront — only includes what's actually set. */
export async function getStorefrontThemeCss(): Promise<string> {
  return buildStorefrontThemeCss(await getAdminThemeSettings());
}

export async function getAuthPageTheme(): Promise<{
  bgColor: string | null;
  panelColor: string | null;
  illustrationSrc: string | null;
}> {
  const settings = await getAdminThemeSettings();
  return {
    bgColor: settings.authBgColor || null,
    panelColor: settings.authPanelColor || null,
    illustrationSrc: settings.authIllustrationSrc || null,
  };
}

export async function getAdminNavTheme(): Promise<{
  bgColor: string | null;
  textColor: string | null;
}> {
  const settings = await getAdminThemeSettings();
  return {
    bgColor: settings.adminNavBgColor || null,
    textColor: settings.adminNavTextColor || null,
  };
}
