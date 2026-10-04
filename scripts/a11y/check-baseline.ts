/**
 * Accessibility baseline (P17-T05).
 *
 *   npm run test:a11y
 *
 * Static guards against known regressions. Not a full axe/WCAG crawl.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

function main(): void {
  const root = process.cwd();

  const layout = readFileSync(join(root, "app/layout.tsx"), "utf8");
  // Phase 10: lang is now the real default-language setting
  // (lang={defaultLanguage?.code ?? "en"}), not a hardcoded literal — check
  // the <html> tag sets a lang attribute at all, and that "en" is still the
  // documented fallback when no language setting exists.
  check(
    "root html sets a lang attribute defaulting to en",
    /<html[^>]*\slang=/.test(layout) && layout.includes('?? "en"'),
  );

  const storefrontLayout = readFileSync(
    join(root, "app/(storefront)/layout.tsx"),
    "utf8",
  );
  check(
    "storefront has skip link to main content",
    storefrontLayout.includes('href="#main-content"') &&
      storefrontLayout.includes("Skip to content") &&
      storefrontLayout.includes('id="main-content"'),
  );

  const globals = readFileSync(join(root, "app/globals.css"), "utf8");
  check(
    "global :focus-visible outline is defined",
    globals.includes(":focus-visible") &&
      globals.includes("outline: 2px solid var(--color-focus)"),
  );

  const header = readFileSync(
    // The search bar moved out of site-header.tsx in the live-search commit.
    join(root, "components/layout/header-search.tsx"),
    "utf8",
  );
  check(
    "header search uses focus-within outline + sr-only label",
    header.includes("focus-within:outline") &&
      header.includes("Search products") &&
      header.includes('aria-label="Search"'),
  );

  const footer = readFileSync(
    join(root, "components/layout/site-footer.tsx"),
    "utf8",
  );
  check(
    "footer track form keeps keyboard focus outline",
    footer.includes("focus-within:outline") &&
      !footer.includes("focus-visible:outline-none"),
  );

  const newsletter = readFileSync(
    join(root, "components/layout/footer-newsletter-form.tsx"),
    "utf8",
  );
  check(
    "newsletter form keeps keyboard focus outline",
    newsletter.includes("focus-within:outline") &&
      !newsletter.includes("focus-visible:outline-none"),
  );

  const field = readFileSync(join(root, "components/ui/field.tsx"), "utf8");
  check(
    "Field wires aria-invalid / aria-describedby for errors",
    field.includes("aria-invalid") &&
      field.includes("aria-describedby") &&
      field.includes("cloneElement"),
  );

  const dialog = readFileSync(join(root, "components/ui/dialog.tsx"), "utf8");
  check(
    "Dialog exposes aria-labelledby",
    dialog.includes("aria-labelledby") && dialog.includes("th-dialog-title"),
  );

  const sheet = readFileSync(join(root, "components/ui/sheet.tsx"), "utf8");
  check(
    "Sheet exposes aria-labelledby + labelled close",
    sheet.includes("aria-labelledby") &&
      sheet.includes("th-sheet-title") &&
      sheet.includes("aria-label={closeLabel}"),
  );

  const design = readFileSync(join(root, "docs/DESIGN_SYSTEM.md"), "utf8");
  check(
    "design system documents keyboard + WCAG AA contrast rules",
    design.includes("Keyboard accessible") && design.includes("WCAG AA"),
  );

  console.log(
    failures === 0
      ? `ok ${checks} a11y checks`
      : `failed ${failures}/${checks} a11y checks`,
  );
  if (failures > 0) {
    process.exit(1);
  }
}

main();
