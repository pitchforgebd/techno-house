"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";
import {
  notifyAddedToCart,
  notifyError,
} from "@/components/ui/feedback-provider";
import { useCartStore } from "@/features/cart/use-cart-store";
import type { StockStatus } from "@/lib/data";
import { cartItemCount } from "@/lib/cart/cart";
import type { TrackItem } from "@/lib/tracking/events";
import { track } from "@/lib/tracking/track";

type AddToCartButtonProps = {
  slug: string;
  stockStatus: StockStatus;
  size?: ButtonSize;
  variant?: ButtonVariant;
  className?: string;
  showHint?: boolean;
  /** Not yet stocked but launching soon — disables the button and shows
   * "Up Coming" regardless of `stockStatus`. */
  isComingSoon?: boolean;
  /** Orderable ahead of stock arriving — bypasses the usual out-of-stock
   * disable and shows "Place Pre Order" instead. */
  isPreOrder?: boolean;
  /** Tracking item for add_to_cart (AD-389); omitted = no event. */
  trackItem?: TrackItem;
};

export function AddToCartButton({
  slug,
  stockStatus,
  size = "md",
  variant = "primary",
  className,
  showHint = true,
  isComingSoon = false,
  isPreOrder = false,
  trackItem,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { state, addItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);
  const unavailable =
    isComingSoon || (stockStatus === "out_of_stock" && !isPreOrder);
  const inCart = state.lines.some((line) => line.slug === slug);
  const count = cartItemCount(state);

  const button = (
    <button
      type="button"
      disabled={unavailable}
      className={buttonClassName({
        variant,
        size,
        className: className ?? "w-full",
      })}
      onClick={() => {
        if (unavailable) {
          notifyError({
            title: isComingSoon ? "Up Coming" : "Out of stock",
            description: isComingSoon
              ? "This item is not available to order yet."
              : "This item cannot be added while it is out of stock.",
          });
          return;
        }
        void addItem(slug, 1).then((result) => {
          if (!result.ok) {
            notifyError({
              title: "Could not add to cart",
              description: result.reason,
            });
            return;
          }
          setJustAdded(true);
          if (trackItem) {
            track("AddToCart", { items: [{ ...trackItem, quantity: 1 }] });
          }
          notifyAddedToCart(() => router.push("/cart"));
        });
      }}
    >
      {isComingSoon
        ? "Up Coming"
        : stockStatus === "out_of_stock" && !isPreOrder
          ? "Out of stock"
          : justAdded || inCart
            ? "Added to cart"
            : isPreOrder
              ? "Place Pre Order"
              : "Add to cart"}
    </button>
  );

  if (!showHint) {
    return button;
  }

  return (
    <div className="space-y-2">
      {button}
      {justAdded || inCart ? (
        <p className="text-caption text-text-muted">
          <Link
            href="/cart"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            View cart
          </Link>
          {count > 0 ? (
            <span className="tabular-nums">
              {" "}
              · {count} items (display only)
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
