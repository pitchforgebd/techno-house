/**
 * Storefront "jump up" animation (AD-364).
 *
 *   npm run test:jump-up
 *
 * Buttons, icon controls, the cart icon and the alerts hop or pop up on the
 * customer storefront — and nowhere else. A unit test cannot see an animation,
 * so this suite pins what can silently break:
 *   - the rules that decide what hops (`lib/ui/jump-up.ts`), exercised directly;
 *   - the CSS contract: keyframes exist, only `transform` is animated (so a
 *     control that is lifted on hover or centred with a translate utility keeps
 *     its place), the hop is switched off for reduced motion, and the alert
 *     transitions are NOT (the toast library removes a toast on `animationend`);
 *   - the wiring: the effect component is mounted in the storefront layout only,
 *     the toast container keeps its default transition on /admin, and the
 *     controls carry the right markers.
 * The real motion was measured in headless Chrome against the dev server when
 * this was built (see AD-364 in project-memory/TASKS.md). No database, no network.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  CART_JUMP_WINDOW_MS,
  JUMP_CLEAR_MS,
  JUMP_MAX_HEIGHT,
  JUMP_MAX_WIDTH,
  JUMP_TARGET_SELECTOR,
  cartGrew,
  isJumpEligible,
} from "../../lib/ui/jump-up";

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

/** Every .ts/.tsx file under a folder, with forward slashes in the paths. */
function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry).split(String.fromCharCode(92)).join("/");
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      found.push(path);
    }
  }
  return found;
}

/** The body of `@keyframes name { ... }`, or "" when it does not exist. */
function keyframes(css: string, name: string): string {
  const start = css.indexOf(`@keyframes ${name} {`);
  if (start < 0) {
    return "";
  }
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") {
      depth += 1;
    } else if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return css.slice(start, index + 1);
      }
    }
  }
  return "";
}

/** The `@media (prefers-reduced-motion: reduce) { ... }` blocks that mention `needle`. */
function reducedMotionBlockWith(css: string, needle: string): string {
  const marker = "@media (prefers-reduced-motion: reduce) {";
  let from = 0;
  for (;;) {
    const start = css.indexOf(marker, from);
    if (start < 0) {
      return "";
    }
    let depth = 0;
    let end = start;
    for (let index = css.indexOf("{", start); index < css.length; index += 1) {
      if (css[index] === "{") {
        depth += 1;
      } else if (css[index] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    const block = css.slice(start, end + 1);
    if (block.includes(needle)) {
      return block;
    }
    from = end + 1;
  }
}

function rules(): void {
  const control = { disabled: false, ariaDisabled: false, optedOut: false, width: 160, height: 44 };
  check("an ordinary button-sized control hops", isJumpEligible(control));
  check("a disabled button does not hop", !isJumpEligible({ ...control, disabled: true }));
  check("an aria-disabled control does not hop", !isJumpEligible({ ...control, ariaDisabled: true }));
  check("a control that opted out does not hop", !isJumpEligible({ ...control, optedOut: true }));
  check("an element with no size (hidden) does not hop", !isJumpEligible({ ...control, width: 0, height: 0 }) && !isJumpEligible({ ...control, width: 160, height: 0 }));
  check("a card-sized control (wide or tall) does not hop", !isJumpEligible({ ...control, width: 640, height: 120 }) && !isJumpEligible({ ...control, width: 200, height: JUMP_MAX_HEIGHT + 1 }) && !isJumpEligible({ ...control, width: JUMP_MAX_WIDTH + 1, height: 44 }));
  check("a product-tile-sized control (300 x 120) does not hop", !isJumpEligible({ ...control, width: 300, height: 120 }));
  check("the size limits themselves are inclusive", isJumpEligible({ ...control, width: JUMP_MAX_WIDTH, height: JUMP_MAX_HEIGHT }));
  check("a full-width phone call to action (360 x 48) still hops", isJumpEligible({ ...control, width: 360, height: 48 }));

  check("the cart icon hops when the count grows right after a click", cartGrew(2, 3, 300));
  check("the cart icon does not hop on the first reading of the cart", !cartGrew(null, 3, 100));
  check(
    "the cart icon does not hop when the cart is filled in after page load (no recent click)",
    !cartGrew(0, 3, 60_000) && !cartGrew(0, 3, Date.now()),
  );
  check("the cart icon does not hop when the count stays or drops", !cartGrew(3, 3, 100) && !cartGrew(3, 2, 100));
  check("a click in the future (clock skew) does not count", !cartGrew(1, 2, -50));
  check("the add window is inclusive of its limit and ends right after", cartGrew(1, 2, CART_JUMP_WINDOW_MS) && !cartGrew(1, 2, CART_JUMP_WINDOW_MS + 1));

  for (const part of ["button", '[role="button"]', ".th-btn", ".th-icon-hop"]) {
    check(`the click target selector covers ${part}`, JUMP_TARGET_SELECTOR.includes(part));
  }
}

function css(): void {
  const sheet = source("app/globals.css");
  const up = keyframes(sheet, "th-jump-up");
  const into = keyframes(sheet, "th-jump-in");
  const out = keyframes(sheet, "th-jump-out");

  check("the hop, entrance and exit keyframes exist", up.length > 0 && into.length > 0 && out.length > 0);
  check(
    "the hop rises at least 6px above rest and returns to rest",
    /translateY\(-(\d+)px\)/.test(up) && Number(/translateY\(-(\d+)px\)/.exec(up)?.[1]) >= 6 && up.trimEnd().endsWith("transform: translateY(0);\n  }\n}"),
  );
  check(
    "the entrance starts hidden and below, and ends fully visible at rest",
    /0% \{\n\s+opacity: 0;\n\s+transform: translateY\(\d+px\)/.test(into) && /100% \{\n\s+opacity: 1;\n\s+transform: none;/.test(into),
  );
  for (const [name, body] of [
    ["hop", up],
    ["entrance", into],
    ["exit", out],
  ] as const) {
    check(
      `the ${name} animates transform only, never translate / scale / rotate (they belong to Tailwind utilities)`,
      body.includes("transform:") && !/(^|\s)(translate|scale|rotate):/.test(body),
    );
  }

  check(
    "a clicked control hops through the data attribute, in 600ms or less",
    /\[data-th-jump\] \{\n\s+animation: th-jump-up (\d+)ms linear;/.test(sheet) &&
      Number(/\[data-th-jump\] \{\n\s+animation: th-jump-up (\d+)ms/.exec(sheet)?.[1]) <= 600,
  );
  check(
    "the attribute is cleared only after the hop has finished",
    Number(/\[data-th-jump\] \{\n\s+animation: th-jump-up (\d+)ms/.exec(sheet)?.[1]) < JUMP_CLEAR_MS,
  );
  check(
    "an icon control's glyph hops on hover and on keyboard focus",
    sheet.includes(".th-icon-hop:hover svg,\n.th-icon-hop:focus-visible svg {\n  animation: th-jump-up"),
  );

  const reduced = reducedMotionBlockWith(sheet, "[data-th-jump]");
  check(
    "reduced motion switches the click hop and the icon hop off completely",
    reduced.includes("[data-th-jump]") && reduced.includes(".th-icon-hop:hover svg") && reduced.includes("animation: none"),
  );
  check(
    "reduced motion does NOT switch the toast transitions off (the library removes a toast on animationend)",
    !reduced.includes("Toastify") && !reduced.includes("th-toast-jump"),
  );

  check(
    "the toast container's transition classes use the shared entrance and an exit",
    sheet.includes(".Toastify__toast.th-toast-jump-in {\n  animation: th-jump-in") &&
      sheet.includes(".Toastify__toast.th-toast-jump-out {\n  animation: th-jump-out"),
  );
  check(
    "the corner alert enters with the shared entrance; its old private entrance is gone",
    sheet.includes(".th-alert {\n  animation: th-jump-in") && !sheet.includes("th-alert-in"),
  );
  check("a reusable .th-jump-in class exists for alerts that mount on demand", sheet.includes(".th-jump-in {\n  animation: th-jump-in"));
}

function wiring(): void {
  const storefrontLayout = source("app/(storefront)/layout.tsx");
  const effects = source("components/storefront/jump-up-effects.tsx");
  const feedback = source("components/ui/feedback-provider.tsx");

  check(
    "the effects component is mounted in the storefront layout, inside the cart provider",
    storefrontLayout.includes('import { JumpUpEffects } from "@/components/storefront/jump-up-effects"') &&
      storefrontLayout.includes("<JumpUpEffects />") &&
      storefrontLayout.indexOf("<JumpUpEffects />") > storefrontLayout.indexOf("<CartProvider") &&
      storefrontLayout.indexOf("<JumpUpEffects />") < storefrontLayout.indexOf("</CartProvider>"),
  );
  const importers = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("features")].filter(
    (path) => !path.endsWith("jump-up-effects.tsx") && source(path).includes('/jump-up-effects"'),
  );
  check(
    `nothing but the storefront layout imports the effects component (found: ${importers.join(", ")})`,
    importers.length === 1 && importers[0] === "app/(storefront)/layout.tsx",
  );
  const adminFiles = [...sourceFiles("app/(admin)"), ...sourceFiles("features/admin")];
  const adminHits = adminFiles.filter((path) => /th-icon-hop|data-cart-jump|data-th-jump|th-jump-in|JumpUp/.test(source(path)));
  check(`no admin file uses the jump-up markers (found: ${adminHits.join(", ") || "none"})`, adminHits.length === 0);

  check(
    "the click listener runs in the capture phase and is removed on unmount",
    effects.includes('document.addEventListener("click", onClick, true)') && effects.includes('document.removeEventListener("click", onClick, true)'),
  );
  check(
    "a click is filtered through the shared rules (disabled, opt-out, size)",
    effects.includes("isJumpEligible(") && effects.includes("JUMP_OPT_OUT_ATTRIBUTE") && effects.includes("aria-disabled"),
  );
  check(
    "the cart icons hop only through the shared cart rule, and a repeated hop restarts cleanly",
    effects.includes("cartGrew(") && effects.includes("CART_JUMP_ATTRIBUTE") && effects.includes("void (element as HTMLElement).offsetWidth") && effects.includes("clearTimers"),
  );
  check("the effects component draws nothing", effects.includes("return null;"));

  check(
    "the toast container uses the jump-up transition everywhere except /admin",
    feedback.includes('const pathname = usePathname()') &&
      feedback.includes('pathname === "/admin" || pathname?.startsWith("/admin/")') &&
      feedback.includes("transition={inAdmin ? undefined : JumpUp}"),
  );
  check(
    "the toast transition's class names match the stylesheet",
    feedback.includes('enter: "th-toast-jump-in"') && feedback.includes('exit: "th-toast-jump-out"'),
  );

  check("link-style buttons carry the th-btn marker", source("components/ui/button.tsx").includes('"th-btn inline-flex'));
  check("the header icon buttons carry th-icon-hop", source("components/layout/header-action-class.ts").includes('"th-icon-hop relative'));
  check(
    "the header cart is a cart-jump target",
    source("components/layout/header-cart.tsx").includes("data-cart-jump"),
  );
  const mobile = source("components/layout/mobile-bottom-nav.tsx");
  check(
    "the mobile cart tab is a cart-jump target and its tabs are icon controls",
    mobile.includes('data-cart-jump={item.href === "/cart" ? "" : undefined}') && mobile.includes('"th-icon-hop flex'),
  );
  check("the product-card icon buttons carry th-icon-hop", source("features/catalog/product-card-hover-actions.tsx").includes('"th-icon-hop inline-flex'));
  check("the sale alert pops up with the shared entrance", source("components/storefront/sale-alert-toast.tsx").includes('className="th-jump-in fixed'));
}

function main(): void {
  rules();
  css();
  wiring();

  if (failures > 0) {
    console.error(`\njump up: ${failures} of ${checks} checks FAILED`);
    process.exit(1);
  }
  console.log(`jump up ok — ${checks} checks`);
}

main();
