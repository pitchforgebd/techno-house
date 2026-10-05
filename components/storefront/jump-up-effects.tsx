"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/features/cart/use-cart-store";
import { cartItemCount } from "@/lib/cart/cart";
import {
  CART_JUMP_ATTRIBUTE,
  JUMP_ATTRIBUTE,
  JUMP_CLEAR_MS,
  JUMP_OPT_OUT_ATTRIBUTE,
  JUMP_TARGET_SELECTOR,
  cartGrew,
  isJumpEligible,
} from "@/lib/ui/jump-up";

const clearTimers = new WeakMap<Element, number>();

/** Starts the hop; a second click while one is running restarts it from the top. */
function playJump(element: Element) {
  const pending = clearTimers.get(element);
  if (pending !== undefined) {
    window.clearTimeout(pending);
  }
  element.removeAttribute(JUMP_ATTRIBUTE);
  // Reading the layout forces the removal to apply, so re-adding restarts the keyframes.
  void (element as HTMLElement).offsetWidth;
  element.setAttribute(JUMP_ATTRIBUTE, "");
  clearTimers.set(
    element,
    window.setTimeout(() => {
      element.removeAttribute(JUMP_ATTRIBUTE);
      clearTimers.delete(element);
    }, JUMP_CLEAR_MS),
  );
}

/**
 * The customer storefront's "jump up" feedback (AD-364): one document-level
 * listener makes any button or icon control hop when it is clicked, and the
 * cart icons hop when an item is added. It renders nothing and is mounted only
 * in `app/(storefront)/layout.tsx`, so the admin panel never gets it.
 * Add `data-no-jump` to a control to keep it still.
 */
export function JumpUpEffects() {
  const { state } = useCartStore();
  const count = cartItemCount(state);
  const lastGestureAt = useRef(0);
  const previousCount = useRef<number | null>(null);

  useEffect(() => {
    function onGesture() {
      lastGestureAt.current = Date.now();
    }
    function onClick(event: MouseEvent) {
      onGesture();
      if (!(event.target instanceof Element)) {
        return;
      }
      const control = event.target.closest(JUMP_TARGET_SELECTOR);
      if (!control) {
        return;
      }
      const box = control.getBoundingClientRect();
      const eligible = isJumpEligible({
        disabled: (control as HTMLButtonElement).disabled === true,
        ariaDisabled: control.getAttribute("aria-disabled") === "true",
        optedOut: control.closest(`[${JUMP_OPT_OUT_ATTRIBUTE}]`) !== null,
        width: box.width,
        height: box.height,
      });
      if (eligible) {
        playJump(control);
      }
    }
    // Capture phase: a handler that stops propagation must not hide the click from us.
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }, []);

  useEffect(() => {
    const before = previousCount.current;
    previousCount.current = count;
    if (!cartGrew(before, count, Date.now() - lastGestureAt.current)) {
      return;
    }
    document
      .querySelectorAll(`[${CART_JUMP_ATTRIBUTE}]`)
      .forEach((icon) => playJump(icon));
  }, [count]);

  return null;
}
