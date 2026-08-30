"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import {
  notifyAddedToCart,
  notifyError,
} from "@/components/ui/feedback-provider";
import { useCartStore } from "@/features/cart/use-cart-store";
import type { StockStatus } from "@/lib/data";
import { cartItemCount } from "@/lib/cart/cart";

type AddToCartButtonProps = {
  slug: string;
  stockStatus: StockStatus;
  size?: "sm" | "md";
  className?: string;
};

export function AddToCartButton({
  slug,
  stockStatus,
  size = "md",
  className,
}: AddToCartButtonProps) {
  const router = useRouter();
  const { state, addItem } = useCartStore();
  const [justAdded, setJustAdded] = useState(false);
  const unavailable = stockStatus === "out_of_stock";
  const inCart = state.lines.some((line) => line.slug === slug);
  const count = cartItemCount(state);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={unavailable}
        className={buttonClassName({
          size,
          className: className ?? "w-full",
        })}
        onClick={() => {
          if (unavailable) {
            notifyError({
              title: "Out of stock",
              description:
                "This item cannot be added while it is out of stock.",
            });
            return;
          }
          addItem(slug, 1);
          setJustAdded(true);
          notifyAddedToCart(() => router.push("/cart"));
        }}
      >
        {unavailable
          ? "Out of stock"
          : justAdded || inCart
            ? "Added to cart"
            : "Add to cart"}
      </button>
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
