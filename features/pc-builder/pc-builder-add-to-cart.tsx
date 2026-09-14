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
  planValidatedBuildToCart,
  type BuildSelection,
  type BuildValidationIssue,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder";

export function PcBuilderAddToCart({
  selection,
  products,
  productsPending,
  compatibility,
  issues,
}: {
  selection: BuildSelection;
  products: ProductSummary[];
  productsPending: boolean;
  compatibility: CompatibilityResult | null;
  issues: BuildValidationIssue[];
}) {
  const router = useRouter();
  const { state, persist, addBuild } = useCartStore();
  const [message, setMessage] = useState<string | null>(null);
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const filled = countFilledSlots(selection).filled;

  const plan = useMemo(
    () =>
      planValidatedBuildToCart({
        selection,
        products: products.map((product) => ({
          slug: product.slug,
          stockStatus: product.stockStatus,
        })),
        compatibility,
        issues,
        existingCartSlugs: state.lines.map((line) => line.slug),
        maxCartLines: MAX_CART_LINES,
      }),
    [selection, products, compatibility, issues, state.lines],
  );

  const planKey = plan.ok ? plan.slugs.join("|") : "";
  const added = Boolean(planKey && addedKey === planKey);
  const waitingForProducts = productsPending && filled > 0;
  const disabled = waitingForProducts || pending || !plan.ok;

  const helperText = waitingForProducts
    ? "Updating build details…"
    : pending
      ? "Checking this build on the server…"
      : !plan.ok
        ? plan.reason
        : plan.hasUnknownCompatibility
          ? "Some compatibility checks are unverified. You can still add the build."
          : persist
            ? "The server will recheck stock and compatibility, then add the parts."
            : "Saved on this device. Turn off mock data to persist the cart.";

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
            : pending
              ? "Checking this build on the server"
              : plan.ok
                ? "Add all selected parts to the cart"
                : plan.reason
        }
        onClick={() => {
          if (waitingForProducts || pending || !plan.ok) {
            if (!waitingForProducts && !pending && !plan.ok) {
              setMessage(plan.reason);
              setAddedKey(null);
              notifyError({
                title: "Cannot add build",
                description: plan.reason,
              });
            }
            return;
          }
          setPending(true);
          void addBuild(selection)
            .then((result) => {
              if (!result.ok) {
                setMessage(result.reason);
                setAddedKey(null);
                notifyError({
                  title: "Cannot add build",
                  description: result.reason,
                });
                return;
              }
              setAddedKey(plan.slugs.join("|"));
              const text = plan.hasUnknownCompatibility
                ? "Build added. Some compatibility checks still need more data."
                : persist
                  ? "Build added to cart."
                  : "Build added on this device.";
              setMessage(text);
              notifyBuildAddedToCart(text, () => router.push("/cart"));
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <ShoppingCart className="size-4" aria-hidden />
        {pending ? "Adding…" : added ? "Build added" : "Add build to cart"}
      </button>
      {helperText ? (
        <p className="text-caption text-text-muted" role="status">
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
