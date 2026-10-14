/**
 * No visible scrollbar under a wide admin table (AD-372).
 *
 *   npm run test:table-scroll
 *
 * The shared `Table` component (`components/ui/table.tsx`) wraps every table
 * on the site — 30+ admin list pages — in its OWN `overflow-x-auto` div. Every
 * one of those pages ALSO wraps `<Table>` in a `th-scroll-hide overflow-x-auto`
 * div of its own, which made it look like scrollbars were already handled —
 * but the shared component's INNER wrapper never had `th-scroll-hide`, so
 * whenever a table (like Admin -> Products, 11 columns, `min-w-[72rem]`) was
 * wider than even the outer wrapper's content box, it was the inner wrapper
 * that actually scrolled, with a plain, visible, native scrollbar. A second,
 * unrelated oddity was found alongside it while testing in headless Chrome: at
 * some widths `document.documentElement` reports a few tens of pixels more
 * `scrollWidth` than any element in the page actually accounts for (a
 * Chromium table-layout quirk, not reproducible in a way that points at any
 * one element) — `html`/`body` now carry a defensive `overflow-x: hidden` so
 * the page itself can never show its own scrollbar for that reason either,
 * independent of whatever causes it.
 * Real browser verification (a production build, three widths, the row
 * action menu opened, headless Chrome) is recorded in AD-372 in
 * project-memory/TASKS.md. No database, no network.
 */
import { readFileSync } from "node:fs";

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}`);
  }
}

/** Source text with Windows line endings normalised, so patterns can use a plain newline. */
function source(path: string): string {
  const crlf = String.fromCharCode(13, 10);
  const lf = String.fromCharCode(10);
  return readFileSync(path, "utf8").split(crlf).join(lf);
}

function main(): void {
  const table = source("components/ui/table.tsx");
  check(
    "the shared Table component's own wrapper hides its scrollbar",
    table.includes('<div className="th-scroll-hide overflow-x-auto">') &&
      !table.includes('<div className="overflow-x-auto">'),
  );
  check(
    "the wrapper still scrolls (overflow-x-auto kept, not swapped for something that blocks scrolling)",
    table.includes("overflow-x-auto"),
  );

  const css = source("app/globals.css");
  check(
    "html and body both defensively clip horizontal overflow",
    /html\s*\{[^}]*overflow-x:\s*hidden;[^}]*\}/.test(css) &&
      /body\s*\{[^}]*overflow-x:\s*hidden;[^}]*\}/.test(css),
  );
  check(
    "the page-level fix does not touch the intentionally-scrollable table/th-scroll-hide rule itself",
    css.includes(".th-scroll-hide {\n  scrollbar-width: none;"),
  );

  // Every admin list page still wraps <Table> in its own th-scroll-hide div —
  // that outer wrapper is now redundant but harmless, and removing it from 30
  // files is unrelated to this fix; this just confirms nobody is relying on
  // the component's old, unhidden inner scrollbar on purpose.
  const callers = [
    "features/admin/products/admin-product-table.tsx",
    "features/admin/orders/admin-order-list.tsx",
    "features/admin/customers/admin-customer-list.tsx",
  ];
  for (const path of callers) {
    check(`${path} still renders <Table> (the fix is inside the shared component, nothing to change here)`, source(path).includes("<Table"));
  }

  if (failures > 0) {
    console.error(`\ntable scroll: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`table scroll ok — ${checks} checks`);
}

main();
