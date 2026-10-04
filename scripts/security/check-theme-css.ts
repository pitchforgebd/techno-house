/**
 * Theme CSS emission suite (Admin Appearance, phase 1).
 *
 *   npm run test:theme
 *
 * `getStorefrontThemeCss()` builds a `:root{…}` block that the storefront
 * layout injects with `dangerouslySetInnerHTML`. That makes it the one place
 * where operator-supplied data becomes raw CSS, so it is worth treating as a
 * serialization boundary rather than a string template.
 *
 * Save-time validation already rejects anything that is not `#rrggbb`. It is
 * not sufficient on its own, and the distinction is the point of this suite:
 * that check runs on the WRITE. A row edited directly in psql, restored from an
 * older backup, or written by some future code path has never been through it.
 * These tests drive the emitter with values that could never have been saved
 * through the admin form, because that is precisely the case the render-time
 * check exists for.
 *
 * Most of what follows is pure — `buildStorefrontThemeCss` takes a settings
 * object — so the malicious payloads never touch the database. The last
 * section does one real round trip, writing a corrupt value to the singleton
 * row and restoring it in `finally`, because "a corrupt database value cannot
 * reach the page" is a claim about the database and cannot honestly be tested
 * without one.
 */
import { config as loadEnvFiles } from "dotenv";
import { readFileSync } from "node:fs";
import { getPrisma } from "../../lib/db/prisma";
import {
  buildStorefrontThemeCss,
  getStorefrontThemeCss,
  THEME_COLOR_TOKEN_LIST,
  type AdminThemeSettings,
} from "../../lib/design/theme-settings";
import { contrastRatio, judgeContrast } from "../../lib/design/contrast";
import { canAccessAdminPath } from "../../lib/auth/admin-route-permissions";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let failures = 0;
let passes = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.error(`fail ${label}${detail ? ` — ${detail}` : ""}`);
}

/** A settings object with everything empty, so each case varies one field. */
const EMPTY_SETTINGS: AdminThemeSettings = {
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

function withBase(value: string): AdminThemeSettings {
  return { ...EMPTY_SETTINGS, themeBaseColor: value };
}

/** Every colour column this suite is capable of writing. */
const SNAPSHOT_SELECT = {
  themeBaseColor: true,
  themeAccentColor: true,
  themeHoverColor: true,
  themeSoftColor: true,
  themeTextColor: true,
  themeBackgroundColor: true,
  themeSurfaceColor: true,
  themeBorderColor: true,
  themeBrightColor: true,
  themeOnPrimaryColor: true,
} as const;

async function main(): Promise<void> {
  const prisma = getPrisma();

  // Taken BEFORE anything runs, and restored in the outer `finally`. This is
  // the live theme configuration, not a fixture: the suite writes real values
  // to it to prove the save path and the corrupt-row path, so leaving it in
  // whatever state the last test happened to produce would be changing the
  // site's appearance as a side effect of running the tests.
  const originalRow = await prisma.designThemeSettings.findUnique({
    where: { id: "singleton" },
    select: SNAPSHOT_SELECT,
  });
  const rowExisted = originalRow !== null;

  try {
    // --- Values that must be emitted ---------------------------------------
    for (const valid of ["#000000", "#FFFFFF", "#3897f0", "#abcdef", "#ABCDEF"]) {
      const css = buildStorefrontThemeCss(withBase(valid));
      check(
        `${valid} is emitted verbatim`,
        css === `:root{--color-primary: ${valid};}`,
        `got ${JSON.stringify(css)}`,
      );
    }

    // --- Values that must NEVER reach the output ---------------------------
    // The first few are merely wrong. The rest are the reason this check
    // exists: each one, concatenated into a style block, ends the declaration
    // and starts something the operator did not intend.
    const rejected = [
      "#fff",
      "#FFF",
      "#ffffff ",
      " #ffffff",
      "#gggggg",
      "#1234567",
      "#12345",
      "red",
      "blue",
      "transparent",
      "currentColor",
      "inherit",
      "rgb(1,2,3)",
      "rgba(0,0,0,1)",
      "hsl(0,0%,0%)",
      "var(--evil)",
      "url(https://example.com)",
      "url(javascript:alert(1))",
      "expression(alert(1))",
      "linear-gradient(red,blue)",
      "#000000;--evil:red",
      "#fff;}</style><script>alert(1)</script>",
      '"></style><script>',
      "#000000}body{display:none",
      "</style>",
      "<script>alert(1)</script>",
      "@import url(https://evil.example)",
      "#000000/*",
      "",
    ];

    for (const payload of rejected) {
      const css = buildStorefrontThemeCss(withBase(payload));
      check(
        `${JSON.stringify(payload)} is not emitted`,
        css === "",
        `got ${JSON.stringify(css)}`,
      );
    }

    // --- The output can never contain markup -------------------------------
    // Asserted over the whole payload list at once, because the individual
    // checks above would still pass if a value were emitted into a DIFFERENT
    // token than the one under test.
    const everyPayload = rejected
      .map((payload) => buildStorefrontThemeCss(withBase(payload)))
      .join("");
    check(
      "no rejected payload produces any output at all",
      everyPayload === "",
      `got ${JSON.stringify(everyPayload.slice(0, 120))}`,
    );
    for (const forbidden of ["<", ">", "</style>", "<script", "@import", "url("]) {
      check(
        `output never contains ${JSON.stringify(forbidden)}`,
        !everyPayload.includes(forbidden),
      );
    }

    // --- Invalid in one field must not poison the others -------------------
    const mixed = buildStorefrontThemeCss({
      ...EMPTY_SETTINGS,
      themeBaseColor: "#123456",
      themeAccentColor: "#fff;}</style><script>alert(1)</script>",
      themeHoverColor: "#654321",
    });
    check(
      "a poisoned field is dropped while its valid siblings survive",
      mixed === ":root{--color-primary: #123456;--color-primary-hover: #654321;}",
      `got ${JSON.stringify(mixed)}`,
    );
    check(
      "and the poisoned value leaves no trace",
      !mixed.includes("script") && !mixed.includes("<"),
    );

    // --- Fallback behaviour -------------------------------------------------
    // "Fall back to the default" means emitting no override, so the built-in
    // value in app/globals.css applies. Anything else would duplicate the
    // defaults in a second place and let the two drift.
    check(
      "an empty settings object emits nothing",
      buildStorefrontThemeCss(EMPTY_SETTINGS) === "",
    );
    check(
      "a null-shaped (empty string) value falls back to the default",
      buildStorefrontThemeCss(withBase("")) === "",
    );
    check(
      "an invalid value falls back to the default rather than erroring",
      buildStorefrontThemeCss(withBase("not-a-color")) === "",
    );

    // --- Allow-list: only known tokens can be produced ----------------------
    const allSet = buildStorefrontThemeCss({
      ...EMPTY_SETTINGS,
      themeBaseColor: "#111111",
      themeAccentColor: "#222222",
      themeHoverColor: "#333333",
      themeSoftColor: "#444444",
      themeTextColor: "#aaaaaa",
      themeBackgroundColor: "#bbbbbb",
      themeSurfaceColor: "#cccccc",
      themeBorderColor: "#dddddd",
      themeBrightColor: "#eeeeee",
      themeOnPrimaryColor: "#999999",
      // Fields that exist on the settings object but are NOT storefront tokens.
      // They must not appear, or every future settings column becomes a CSS
      // variable by default.
      authBgColor: "#555555",
      authPanelColor: "#666666",
      adminNavBgColor: "#777777",
      adminNavTextColor: "#888888",
    });
    // Exact string, not a set membership test: it also proves no token is
    // emitted twice, which a `.includes()` check would miss. The ORDER follows
    // the admin screen's grouping and carries no rendering meaning.
    check(
      "exactly the ten approved colour tokens are emitted, once each",
      allSet ===
        ":root{--color-primary: #111111;--color-secondary: #222222;" +
          "--color-primary-bright: #eeeeee;--color-primary-soft: #444444;" +
          "--color-text: #aaaaaa;--color-background: #bbbbbb;" +
          "--color-surface: #cccccc;--color-border: #dddddd;" +
          "--color-primary-foreground: #999999;" +
          "--color-primary-hover: #333333;}",
      `got ${JSON.stringify(allSet)}`,
    );
    for (const leaked of ["#555555", "#666666", "#777777", "#888888"]) {
      check(
        `non-storefront setting ${leaked} does not leak into the theme CSS`,
        !allSet.includes(leaked),
        "auth and admin-nav colours are not storefront tokens",
      );
    }
    check(
      "no unexpected CSS variable name appears",
      (allSet.match(/--[a-z-]+:/g) ?? []).every((name) =>
        [
          "--color-primary:",
          "--color-secondary:",
          "--color-primary-hover:",
          "--color-primary-soft:",
          "--color-text:",
          "--color-background:",
          "--color-surface:",
          "--color-border:",
          "--color-primary-bright:",
          "--color-primary-foreground:",
          "--font-sans:",
          "--font-heading:",
        ].includes(name),
      ),
      `variables: ${JSON.stringify(allSet.match(/--[a-z-]+:/g))}`,
    );
    check(
      "the block is a single :root rule and nothing else",
      /^:root\{[^{}]*\}$/.test(allSet),
      "a second selector or nested rule was produced",
    );

    // --- Every token validates independently -------------------------------
    // The loop above only exercised themeBaseColor. A token added to the
    // allow-list without the validation guard would sail through that, so each
    // one is driven with the same injection payload.
    const COLOR_FIELDS = [
      "themeBaseColor",
      "themeAccentColor",
      "themeHoverColor",
      "themeSoftColor",
      "themeTextColor",
      "themeBackgroundColor",
      "themeSurfaceColor",
      "themeBorderColor",
      "themeBrightColor",
      "themeOnPrimaryColor",
      "themeHeaderBgColor",
      "themeHeaderTextColor",
      "themeFooterBgColor",
      "themeFooterTextColor",
    ] as const;

    for (const field of COLOR_FIELDS) {
      const poisoned = buildStorefrontThemeCss({
        ...EMPTY_SETTINGS,
        [field]: "#fff;}</style><script>alert(1)</script>",
      });
      check(
        `${field} rejects an injection payload`,
        poisoned === "",
        `got ${JSON.stringify(poisoned)}`,
      );
      const valid = buildStorefrontThemeCss({
        ...EMPTY_SETTINGS,
        [field]: "#0a0b0c",
      });
      check(
        `${field} emits a valid colour`,
        valid.includes("#0a0b0c") && /^:root\{[^{}]*\}$/.test(valid),
        `got ${JSON.stringify(valid)}`,
      );
    }

    // Every allow-listed field must be a real key on the settings type, or the
    // emitter would read `undefined` and silently emit nothing forever.
    for (const field of COLOR_FIELDS) {
      check(
        `${field} exists on AdminThemeSettings`,
        field in EMPTY_SETTINGS,
      );
    }

    // --- Fonts come from a fixed map, never from the database ---------------
    const fonts = buildStorefrontThemeCss({
      ...EMPTY_SETTINGS,
      bodyFont: "inter",
      headingFont: "noto-bengali",
    });
    check(
      "a known font key maps to its constant",
      fonts ===
        ":root{--font-sans: var(--font-inter);--font-heading: var(--font-noto-bengali);}",
      `got ${JSON.stringify(fonts)}`,
    );
    const badFont = buildStorefrontThemeCss({
      ...EMPTY_SETTINGS,
      // Not a FontChoice — only reachable through a direct database edit.
      bodyFont: "'; } body { display:none } /*" as AdminThemeSettings["bodyFont"],
    });
    check(
      "an unknown font key emits nothing",
      badFont === "",
      `got ${JSON.stringify(badFont)}`,
    );

    // --- The real path, with a real corrupt row -----------------------------
    // Snapshotted and restored unconditionally: this is the live theme
    // configuration, not a fixture.
    const existed = rowExisted;
    const originalBase = originalRow?.themeBaseColor ?? null;

    try {
      await prisma.designThemeSettings.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          themeBaseColor: "#fff;}</style><script>alert(1)</script>",
        },
        update: { themeBaseColor: "#fff;}</style><script>alert(1)</script>" },
      });
      const live = await getStorefrontThemeCss();
      check(
        "a corrupt database value never reaches the generated CSS",
        !live.includes("<") && !live.includes("script"),
        `got ${JSON.stringify(live.slice(0, 160))}`,
      );

      await prisma.designThemeSettings.update({
        where: { id: "singleton" },
        data: { themeBaseColor: "#3897f0" },
      });
      // `getStorefrontThemeCss` is request-cached, so a fresh read has to go
      // through the pure builder — which is what the storefront would get on
      // its next request anyway.
      const good = buildStorefrontThemeCss({
        ...EMPTY_SETTINGS,
        themeBaseColor: "#3897f0",
      });
      check(
        "a valid database value is emitted exactly",
        good === ":root{--color-primary: #3897f0;}",
        `got ${JSON.stringify(good)}`,
      );
    } finally {
      if (existed) {
        await prisma.designThemeSettings.update({
          where: { id: "singleton" },
          data: { themeBaseColor: originalBase },
        });
      } else {
        await prisma.designThemeSettings
          .delete({ where: { id: "singleton" } })
          .catch(() => undefined);
      }
    }

    const restored = await prisma.designThemeSettings.findUnique({
      where: { id: "singleton" },
      select: { themeBaseColor: true },
    });
    check(
      "the live theme row was restored exactly as it was found",
      (restored?.themeBaseColor ?? null) === originalBase &&
        (restored !== null) === existed,
      `before=${JSON.stringify(originalBase)} after=${JSON.stringify(restored?.themeBaseColor ?? null)}`,
    );

    // --- Save-time validation and patch semantics ---------------------------
    // Round-tripped through the real save path, because the distinction
    // between "not mentioned" and "cleared" only exists in the database.
    const { saveAppearanceSettings } = await import(
      "../../lib/design/theme-settings"
    );

    const fourOnly = {
      themeBaseColor: "",
      themeAccentColor: "",
      themeHoverColor: "",
      themeSoftColor: "",
    };

    const rejectedSave = await saveAppearanceSettings({
      ...fourOnly,
      themeTextColor: "#fff;}</style><script>",
    });
    check(
      "save rejects an invalid value for a newly added colour",
      !rejectedSave.ok,
      "save-time validation does not cover the phase-2 fields",
    );
    check(
      "and the refusal names the field the operator sees",
      !rejectedSave.ok && /Text color/i.test(rejectedSave.formError),
      !rejectedSave.ok ? rejectedSave.formError : undefined,
    );

    const savedNew = await saveAppearanceSettings({
      ...fourOnly,
      themeTextColor: "#123abc",
    });
    check("save accepts a valid new colour", savedNew.ok);
    const afterSave = await prisma.designThemeSettings.findUnique({
      where: { id: "singleton" },
      select: { themeTextColor: true, themeSurfaceColor: true },
    });
    check(
      "the new colour is persisted",
      afterSave?.themeTextColor === "#123abc",
      `got ${JSON.stringify(afterSave?.themeTextColor)}`,
    );
    check(
      "a field the caller never mentioned stays null",
      afterSave?.themeSurfaceColor === null,
      "an unmentioned field was overwritten",
    );

    // Omitting a field must not reset it — otherwise the existing four-field
    // Appearance form would wipe every phase-2 colour on every save.
    const savedFourOnly = await saveAppearanceSettings(fourOnly);
    check("a four-field save still succeeds", savedFourOnly.ok);
    const afterPartial = await prisma.designThemeSettings.findUnique({
      where: { id: "singleton" },
      select: { themeTextColor: true },
    });
    check(
      "an omitted colour survives a partial save",
      afterPartial?.themeTextColor === "#123abc",
      `got ${JSON.stringify(afterPartial?.themeTextColor)} — the existing admin form would wipe the new colours`,
    );

    // An explicit empty string is how the operator clears a colour.
    const cleared = await saveAppearanceSettings({
      ...fourOnly,
      themeTextColor: "",
    });
    check("clearing a colour succeeds", cleared.ok);
    const afterClear = await prisma.designThemeSettings.findUnique({
      where: { id: "singleton" },
      select: { themeTextColor: true },
    });
    check(
      "an explicit empty string clears the colour back to the default",
      afterClear?.themeTextColor === null,
      `got ${JSON.stringify(afterClear?.themeTextColor)}`,
    );

    // --- The admin screen's defaults must match globals.css ----------------
    // `THEME_COLOR_TOKENS.defaultValue` duplicates the value compiled into
    // app/globals.css so the Appearance screen can show and restore it. That
    // duplication is only safe while something checks it: otherwise a design
    // change to globals.css leaves the admin "Reset" button writing a colour
    // the storefront no longer uses, and the screen quietly lies.
    const globalsCss = readFileSync("app/globals.css", "utf-8");
    for (const token of THEME_COLOR_TOKEN_LIST) {
      const declared = new RegExp(
        `${token.cssVariable}:\\s*(#[0-9a-fA-F]{6})\\s*;`,
      ).exec(globalsCss);
      check(
        `${token.cssVariable} is declared in globals.css`,
        declared !== null,
        "the admin screen offers a token the stylesheet does not define",
      );
      check(
        `${token.cssVariable} default matches globals.css`,
        declared?.[1]?.toLowerCase() === token.defaultValue.toLowerCase(),
        `globals.css=${declared?.[1]} tokenTable=${token.defaultValue}`,
      );
    }
    check(
      "every token default is itself a valid hex",
      THEME_COLOR_TOKEN_LIST.every((token) =>
        /^#[0-9a-fA-F]{6}$/.test(token.defaultValue),
      ),
    );
    check(
      "every token has a label, a description and a group",
      THEME_COLOR_TOKEN_LIST.every(
        (token) =>
          token.label.length > 0 &&
          token.description.length > 0 &&
          ["brand", "surface", "button", "chrome"].includes(token.group),
      ),
      "a token would render in the admin screen with no explanation",
    );
    check(
      "no two tokens drive the same CSS variable",
      new Set(THEME_COLOR_TOKEN_LIST.map((t) => t.cssVariable)).size ===
        THEME_COLOR_TOKEN_LIST.length,
    );

    // Status colours must NOT be exposed: rebranding must never make an
    // "out of stock" warning look like ordinary chrome.
    for (const semantic of [
      "--color-success",
      "--color-danger",
      "--color-warning",
      "--color-info",
      "--color-focus",
    ]) {
      check(
        `${semantic} is not admin-themeable`,
        !THEME_COLOR_TOKEN_LIST.some((t) => t.cssVariable === semantic),
        "a brand change could disguise a status colour",
      );
    }

    // --- Contrast maths -----------------------------------------------------
    check(
      "black on white is 21:1",
      Math.round(contrastRatio("#000000", "#ffffff") ?? 0) === 21,
    );
    check(
      "a colour against itself is 1:1",
      Math.round(contrastRatio("#3897f0", "#3897f0") ?? 0) === 1,
    );
    check(
      "contrast is order-independent",
      contrastRatio("#0b5ed7", "#ffffff") === contrastRatio("#ffffff", "#0b5ed7"),
    );
    check(
      "a malformed colour yields no verdict rather than a wrong one",
      contrastRatio("#fff", "#ffffff") === null &&
        judgeContrast("not-a-colour", "#ffffff") === null,
    );
    // The real default pairing, which the design tokens were measured for.
    const defaultButton = judgeContrast("#ffffff", "#0b5ed7");
    check(
      "the shipped default button passes AA",
      defaultButton?.passesText === true,
      `got ${defaultButton?.label}`,
    );
    const palePrimary = judgeContrast("#ffffff", "#ffe066");
    check(
      "a pale primary is flagged as failing",
      palePrimary?.passesText === false,
      `got ${palePrimary?.label}`,
    );
    check(
      "the displayed ratio is never rounded up past a threshold",
      (judgeContrast("#767676", "#ffffff")?.ratio ?? 99) <= 4.55,
    );

    // --- Storefront pages must not hardcode brand colours -------------------
    // A hardcoded hex is invisible to the theme: the admin can change Primary
    // and that one button stays the old colour. The Track pages carried a
    // near-miss blue (#1d6fd8) that was close enough to look deliberate and
    // different enough to drift, and it also measured 4.52:1 as link text —
    // barely over AA, where the brand token measures 5.43:1.
    //
    // Checked as plain substrings rather than a regex: the thing being
    // forbidden is Tailwind's arbitrary-value syntax, which is a literal
    // `[#` after a utility prefix, and a regex for it needs escaping that is
    // easy to get subtly wrong in a test whose whole job is to be reliable.
    const THEMED_STOREFRONT_FILES = [
      "app/(storefront)/track/page.tsx",
      "app/(storefront)/track/[orderNumber]/page.tsx",
      "app/(storefront)/track/[orderNumber]/not-found.tsx",
      "features/track/track-views.tsx",
    ];
    const ARBITRARY_COLOR_PREFIXES = [
      "bg-[#",
      "text-[#",
      "border-[#",
      "ring-[#",
      "from-[#",
      "to-[#",
      "via-[#",
      "hover:bg-[#",
      "hover:text-[#",
    ];

    for (const file of THEMED_STOREFRONT_FILES) {
      const source = readFileSync(file, "utf-8");
      const found = ARBITRARY_COLOR_PREFIXES.filter((prefix) =>
        source.includes(prefix),
      );
      check(
        `${file} uses theme tokens, not hardcoded colours`,
        found.length === 0,
        `found ${JSON.stringify(found)} — the admin theme cannot reach those`,
      );
      // The specific values that were there, named so a revert is unmistakable.
      check(
        `${file} no longer contains the old track blue`,
        !source.includes("#1d6fd8") && !source.includes("#185bb3"),
      );
    }

    // --- Header and footer are themeable apart from body text ---------------
    // They all sat on `bg-text`, which is the BODY INK. Once that became
    // admin-editable, changing paragraph colour would have silently retinted
    // the whole chrome. These four files must now reference the chrome tokens
    // and not the text token.
    const CHROME_FILES: [string, "header" | "footer"][] = [
      ["components/layout/top-bar.tsx", "header"],
      ["components/layout/site-header.tsx", "header"],
      ["components/layout/category-nav.tsx", "header"],
      ["components/layout/site-footer.tsx", "footer"],
    ];
    for (const [file, chrome] of CHROME_FILES) {
      const source = readFileSync(file, "utf-8");
      check(
        `${file} uses bg-${chrome}-background`,
        source.includes(`bg-${chrome}-background`),
        "the chrome does not follow its own token",
      );
      // `bg-text-muted` and `bg-text/60` are different utilities and are fine;
      // what must be gone is the bare `bg-text` ground.
      check(
        `${file} no longer grounds itself on the body ink`,
        !source.includes("bg-text ") && !source.includes('bg-text"'),
        "changing body text colour would retint the chrome",
      );
      check(
        `${file} uses text-${chrome}-text`,
        source.includes(`${chrome}-text`),
      );
    }

    // The two buttons inside the chrome sit on `bg-primary`, so their label
    // must keep following the BUTTON token. Blanket-replacing the foreground
    // colour in these files would have broken that, and it is invisible until
    // someone sets a dark button-text colour.
    for (const [file, line] of [
      // The header search button lives in header-search.tsx since the
      // live-search commit; same classes, new file.
      ["components/layout/header-search.tsx", "bg-primary px-4 text-primary-foreground"],
      ["components/layout/site-footer.tsx", "bg-primary px-4 text-label font-semibold text-primary-foreground"],
    ] as [string, string][]) {
      check(
        `${file} keeps the button label on the button token`,
        readFileSync(file, "utf-8").includes(line),
        "a button inside the chrome would follow the chrome colour instead",
      );
    }

    // Dark panels OUTSIDE the chrome deliberately still follow `--color-text`.
    // If these had been migrated too, "header background" would have become a
    // misnomer for "every dark surface".
    for (const file of [
      "components/ui/button.tsx",
      "features/account/account-auth-shell.tsx",
      "features/checkout/checkout-confirmation-view.tsx",
    ]) {
      const source = readFileSync(file, "utf-8");
      check(
        `${file} still uses bg-text (not chrome)`,
        source.includes("bg-text"),
        "a non-chrome dark panel was migrated to a header/footer token",
      );
      check(
        `${file} does not reference chrome tokens`,
        !source.includes("header-background") &&
          !source.includes("footer-background"),
      );
    }

    // --- Authorization ------------------------------------------------------
    // Theme settings are privileged configuration: an operator who can change
    // the palette can change what every customer sees. Two separate gates
    // protect it and both are asserted, because they fail differently — the
    // route gate keeps the screen from rendering, the action gate keeps the
    // MUTATION from running even if someone reaches the endpoint directly.
    const APPEARANCE_PATH = "/admin/design-studio/appearance";

    check(
      "the appearance screen is denied with no permissions",
      !canAccessAdminPath(APPEARANCE_PATH, []),
      "the theme screen would be open to any signed-in staff member",
    );
    check(
      "it is denied to a staff member with unrelated permissions",
      !canAccessAdminPath(APPEARANCE_PATH, [
        "orders.view",
        "products.edit",
        "customer.edit",
        "refunds.process",
      ]),
    );
    check(
      "it is allowed with design_studio.view",
      canAccessAdminPath(APPEARANCE_PATH, ["design_studio.view"]),
      "the permission that gates it does not actually grant it",
    );
    // The panel root and the sibling design screens share the same gate, so a
    // narrower permission must not open a wider door.
    check(
      "design_studio.view does not grant unrelated admin areas",
      !canAccessAdminPath("/admin/staff/roles", ["design_studio.view"]) &&
        !canAccessAdminPath("/admin/refunds", ["design_studio.view"]),
    );

    // The action gate is a DIFFERENT permission: viewing the screen is
    // `design_studio.view`, changing the palette is `design_studio.manage`.
    // Collapsing them would silently let read-only staff repaint the site.
    const actionsSrc = readFileSync(
      "features/admin/design-studio/theme-actions.ts",
      "utf-8",
    );
    check(
      "the shared guard requires design_studio.manage",
      /staffWithPermission\("design_studio\.manage"\)/.test(actionsSrc),
      "a viewer could save theme changes",
    );
    check(
      "the guard also enforces same-origin",
      /isSameOriginRequest\(\)/.test(actionsSrc),
      "the save action would be reachable cross-site",
    );
    check(
      "saving the palette is gated, not just the screen",
      /saveAppearanceSettingsAction[\s\S]{0,400}staffWithPermission\("design_studio\.manage"\)/.test(
        actionsSrc,
      ),
    );
    // Every theme mutation, checked INDIVIDUALLY. A file-wide search would
    // pass as long as any one action was guarded, which is exactly the case
    // that hides an unguarded sibling. Each body is sliced between the
    // `export async function` boundaries rather than by a character window.
    const THEME_ACTIONS = [
      "saveAppearanceSettingsAction",
      "saveWatermarkSettingsAction",
      "saveTypographySettingsAction",
      "saveAuthPageSettingsAction",
      "saveAdminNavSettingsAction",
    ];
    for (const action of THEME_ACTIONS) {
      const from = actionsSrc.indexOf(`export async function ${action}`);
      const nextAt = actionsSrc.indexOf("export async function", from + 1);
      const body = actionsSrc.slice(from, nextAt === -1 ? undefined : nextAt);
      check(
        `${action} exists`,
        from !== -1,
        "a theme action was renamed and this check stopped covering it",
      );
      check(
        `${action} calls the shared guard`,
        body.includes("const blocked = await guard()"),
        "an unguarded theme mutation",
      );
      // Two independent checks, deliberately. The guard covers same-origin
      // and permission; this one re-checks permission and is what yields the
      // session used for the audit entry, so the actor recorded is the actor
      // that was authorised.
      check(
        `${action} checks design_studio.manage itself`,
        body.includes('staffWithPermission("design_studio.manage")'),
        "this action would rely solely on the shared guard",
      );
    }
    // Audit logging: a palette change is an outward-facing change and must be
    // attributable.
    const settingsSrc = readFileSync("lib/design/theme-settings.ts", "utf-8");
    // Sliced to the function body rather than matched inside a fixed character
    // window: the function grew when phases 2 and 5 added colours, and a
    // window that happened to be long enough once is a check that silently
    // stops covering anything.
    const appearanceStart = settingsSrc.indexOf(
      "export async function saveAppearanceSettings",
    );
    const appearanceBody = settingsSrc.slice(
      appearanceStart,
      settingsSrc.indexOf("export async function", appearanceStart + 1),
    );
    check(
      "an appearance save is audit-logged",
      appearanceBody.includes("DESIGN_THEME_UPDATE") &&
        appearanceBody.includes("writeAuditLog"),
      "a site-wide visual change would leave no trace",
    );
    check(
      "the audit entry names the section that changed",
      /section: "appearance"/.test(appearanceBody),
    );

    // --- Reset all -----------------------------------------------------------
    // "Reset to defaults" submits every colour as an empty string, which must
    // clear every column rather than only the ones the form last touched.
    const allColors = Object.fromEntries(
      COLOR_FIELDS.map((field) => [field, "#123456"]),
    ) as Record<(typeof COLOR_FIELDS)[number], string>;
    await saveAppearanceSettings(allColors);
    const populated = await prisma.designThemeSettings.findUnique({
      where: { id: "singleton" },
      select: Object.fromEntries(COLOR_FIELDS.map((f) => [f, true])) as never,
    });
    check(
      "every colour can be set at once",
      COLOR_FIELDS.every(
        (field) => (populated as Record<string, unknown>)?.[field] === "#123456",
      ),
    );

    const allEmpty = Object.fromEntries(
      COLOR_FIELDS.map((field) => [field, ""]),
    ) as Record<(typeof COLOR_FIELDS)[number], string>;
    await saveAppearanceSettings(allEmpty);
    const reset = await prisma.designThemeSettings.findUnique({
      where: { id: "singleton" },
      select: Object.fromEntries(COLOR_FIELDS.map((f) => [f, true])) as never,
    });
    check(
      "reset to defaults clears every colour",
      COLOR_FIELDS.every(
        (field) => (reset as Record<string, unknown>)?.[field] === null,
      ),
      `left over: ${JSON.stringify(reset)}`,
    );
    check(
      "and a cleared theme emits no override at all",
      buildStorefrontThemeCss({
        ...EMPTY_SETTINGS,
      }) === "",
    );

    // --- Admin screen: responsive and accessible ----------------------------
    const uiSrc = readFileSync(
      "features/admin/design-studio/admin-appearance-colors.tsx",
      "utf-8",
    );
    check(
      "each colour row stacks on narrow screens",
      /grid gap-2 sm:grid-cols-/.test(uiSrc),
      "the admin screen would scroll horizontally on a phone",
    );
    check(
      "the actions row wraps rather than overflowing",
      /flex flex-wrap items-center justify-between/.test(uiSrc),
    );
    check(
      "every control is labelled for screen readers",
      /aria-label={`\${token.label} hex value`}/.test(uiSrc) &&
        /aria-label={`\${token.label} colour picker`}/.test(uiSrc) &&
        /sr-only/.test(uiSrc),
      "the picker and reset controls would be unlabelled",
    );
    check(
      "a malformed value is announced, not just coloured red",
      /aria-invalid=/.test(uiSrc),
    );

    // --- Dark mode -----------------------------------------------------------
    // There is none. Asserted rather than assumed, so that if one is added
    // later this check fails and the theme work is revisited deliberately —
    // a dark palette would need its own token values, not the same ones.
    check(
      "the app is light-only, so theming needs no dark variant",
      /color-scheme: light/.test(globalsCss) &&
        !/prefers-color-scheme/.test(globalsCss),
      "dark mode exists now and the theme tokens need a dark palette",
    );

    // --- Request-level caching ---------------------------------------------
    const src = readFileSync("lib/design/theme-settings.ts", "utf-8");
    check(
      "the settings read is wrapped in React cache()",
      /import \{ cache \} from "react";/.test(src) &&
        /export const getAdminThemeSettings = cache\(/.test(src),
      "the storefront layout would hit the database on every render",
    );
    check(
      "no cross-request cache was introduced",
      !/unstable_cache|revalidateTag|globalThis\.__theme/.test(src),
      "an admin save must take effect on the next request",
    );
  } finally {
    if (rowExisted && originalRow) {
      await prisma.designThemeSettings.update({
        where: { id: "singleton" },
        data: originalRow,
      });
    } else {
      await prisma.designThemeSettings
        .delete({ where: { id: "singleton" } })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`theme css failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${passes} theme css checks`);
}

main().catch((error) => {
  console.error("theme css suite crashed:", error);
  process.exitCode = 1;
});
