/**
 * Rules for the storefront's "jump up" animation (AD-364).
 *
 * A click on a button, an icon control or an add-to-cart makes the control hop
 * up a few pixels and settle (`th-jump-up` in globals.css). The animation is
 * only ever started by `components/storefront/jump-up-effects.tsx`, which is
 * mounted in the customer storefront layout alone — nothing here runs in the
 * admin panel. Pure and free of browser APIs so the rules can be tested.
 */

/** Set on an element while it hops; globals.css keys the keyframes on it. */
export const JUMP_ATTRIBUTE = "data-th-jump";

/** Marks a header or nav control that hops when the cart gains an item. */
export const CART_JUMP_ATTRIBUTE = "data-cart-jump";

/** Put on any element (or a parent) that must never hop. */
export const JUMP_OPT_OUT_ATTRIBUTE = "data-no-jump";

/**
 * What counts as a button for a click: real buttons, ARIA buttons, links styled
 * with `buttonClassName()` (`th-btn`) and icon controls (`th-icon-hop`).
 */
export const JUMP_TARGET_SELECTOR = [
  "button",
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  ".th-btn",
  ".th-icon-hop",
].join(", ");

/** Longer than the animation, so the attribute is cleared once the hop is over. */
export const JUMP_CLEAR_MS = 800;

/**
 * Card-sized or row-sized "buttons" (a whole product tile, an accordion header
 * that spans the page) would look silly bouncing, so only controls up to this
 * size hop. A full-width call to action on a phone is still well inside it.
 */
export const JUMP_MAX_HEIGHT = 96;
export const JUMP_MAX_WIDTH = 480;

/** How long after a click or key press a growing cart still counts as that person's add. */
export const CART_JUMP_WINDOW_MS = 4000;

/**
 * The PC Builder keeps its own look and feel: no hop on its buttons, on the
 * buttons inside the builder pages, or on any link that opens it (the header
 * call to action, the home page button, the mobile tab). Added after the first
 * version made them jump (AD-365).
 */
const OPT_OUT_PATH = "/pc-builder";

/** True for the PC Builder's own pages: /pc-builder and everything under it. */
export function isJumpOptedOutPath(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }
  return pathname === OPT_OUT_PATH || pathname.startsWith(`${OPT_OUT_PATH}/`);
}

/** True for a link that opens the PC Builder (a relative `href`; a query or hash is ignored). */
export function isJumpOptedOutHref(href: string | null | undefined): boolean {
  if (!href) {
    return false;
  }
  const path = href.split("#")[0]?.split("?")[0];
  return isJumpOptedOutPath(path);
}

export function isJumpEligible(target: {
  disabled: boolean;
  ariaDisabled: boolean;
  optedOut: boolean;
  width: number;
  height: number;
}): boolean {
  if (target.disabled || target.ariaDisabled || target.optedOut) {
    return false;
  }
  // A control that is not on screen has no size; there is nothing to animate.
  if (target.width <= 0 || target.height <= 0) {
    return false;
  }
  return target.width <= JUMP_MAX_WIDTH && target.height <= JUMP_MAX_HEIGHT;
}

/**
 * True when the cart icon should hop: the item count went up AND the person did
 * something a moment ago. The second half matters — the cart is filled in from
 * storage or the server just after the page loads, which also raises the count,
 * and that must not make the icon jump on its own.
 */
export function cartGrew(
  previousCount: number | null,
  nextCount: number,
  msSinceGesture: number,
): boolean {
  if (previousCount === null || nextCount <= previousCount) {
    return false;
  }
  return msSinceGesture >= 0 && msSinceGesture <= CART_JUMP_WINDOW_MS;
}
