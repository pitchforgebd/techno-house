"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import {
  notifyBuildAddedToCart,
  notifyError,
} from "@/components/ui/feedback-provider";
import { useCartStore } from "@/features/cart/use-cart-store";
import type { ProductSummary } from "@/lib/data";
import { MAX_CART_LINES } from "@/lib/cart/cart";
import {
  countFilledSlots,
  planBuildToCart,
  type BuildSelection,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder";

export function PcBuilderAddToCart({
  selection,
  products,
  productsPending,
  compatibility,
}: {
  selection: BuildSelection;
  products: ProductSummary[];
  productsPending: boolean;
  compatibility: CompatibilityResult | null;
}) {
  const router = useRouter();
  const { state, addItems } = useCartStore();
  const [message, setMessage] = useState<string | null>(null);
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const filled = countFilledSlots(selection).filled;

  const plan = useMemo(
    () =>
      planBuildToCart({
        selection,
        products: products.map((product) => ({
          slug: product.slug,
          stockStatus: product.stockStatus,
        })),
        compatibility,
        existingCartSlugs: state.lines.map((line) => line.slug),
        maxCartLines: MAX_CART_LINES,
      }),
    [selection, products, compatibility, state.lines],
  );

  const planKey = plan.ok ? plan.slugs.join("|") : "";
  const added = Boolean(planKey && addedKey === planKey);
  const waitingForProducts = productsPending && filled > 0;
  const disabled = waitingForProducts || !plan.ok;

  const helperText = waitingForProducts
    ? "Updating build details…"
    : !plan.ok
      ? plan.reason
      : plan.hasUnknownCompatibility
        ? "Some compatibility checks are unverified. You can still add the build."
        : null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        className={buttonClassName({
          className: "inline-flex w-full gap-2",
        })}
        title={
          waitingForProducts
            ? "Loading selected parts"
            : plan.ok
              ? "Add all selected parts to the cart"
              : plan.reason
        }
        onClick={() => {
          if (waitingForProducts || !plan.ok) {
            if (!waitingForProducts && !plan.ok) {
              setMessage(plan.reason);
              setAddedKey(null);
              notifyError({
                title: "Cannot add build",
                description: plan.reason,
              });
            }
            return;
          }
          addItems(plan.slugs);
          setAddedKey(plan.slugs.join("|"));
          const text = plan.hasUnknownCompatibility
            ? "Build added. Some compatibility checks still need more data — totals remain display-only."
            : "Build added to cart (display only).";
          setMessage(text);
          notifyBuildAddedToCart(text, () => router.push("/cart"));
        }}
      >
        <ShoppingCart className="size-4" aria-hidden />
        {added ? "Build added" : "Add build to cart"}
      </button>
      {helperText ? (
        <p
          className={
            waitingForProducts
              ? "text-caption text-text-muted"
              : "text-caption text-text-muted"
          }
          role={waitingForProducts ? "status" : undefined}
        >
          {helperText}
        </p>
      ) : null}
      {message ? (
        <p className="text-caption text-text-muted" role="status">
          {message}{" "}
          {added ? (
            <Link
              href="/cart"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              View cart
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
