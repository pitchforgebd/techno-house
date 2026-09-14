"use client";

import Image from "next/image";
import Link from "next/link";
import { Headset, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { IconTrash } from "@/components/layout/chrome-icons";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { loadCartProducts } from "@/features/cart/actions";
import { CartCouponForm } from "@/features/cart/cart-coupon-form";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import type { ProductSummary } from "@/lib/data";
import { cartItemCount, cartLineKey, MAX_LINE_QTY } from "@/lib/cart/cart";
import { loginHref } from "@/lib/account/return-path";
import { applyCouponToSubtotal } from "@/lib/cart/coupons";
import { formatMoney } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

export function CartView({
  couponsEnabled = true,
}: {
  couponsEnabled?: boolean;
}) {
  const confirm = useConfirm();
  const session = useCustomerSession();
  const checkoutHref = session ? "/checkout" : loginHref("/checkout");
  const { state, setQuantity, removeItem, clearCart } = useCartStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();

  async function handleClearCart() {
    const ok = await confirm({
      title: "Clear cart?",
      description: "All items will be removed from your cart.",
      confirmLabel: "Clear cart",
      cancelLabel: "Keep items",
      tone: "danger",
    });
    if (ok) {
      clearCart();
      notifySuccess({
        title: "Cart cleared",
        description: "Your cart is empty.",
      });
    }
  }

  async function handleRemove(
    slug: string,
    name: string,
    colorId: string | null,
  ) {
    const ok = await confirm({
      title: "Remove item?",
      description: name,
      confirmLabel: "Remove",
      cancelLabel: "Keep",
      tone: "danger",
    });
    if (ok) {
      removeItem(slug, colorId);
      notifySuccess({
        title: "Removed",
        description: "Item removed from your cart.",
      });
    }
  }

  const slugs = useMemo(
    () => state.lines.map((line) => line.slug),
    [state.lines],
  );

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const items = await loadCartProducts(slugs);
      if (!cancelled) {
        setProducts(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  const productBySlug = useMemo(() => {
    const map = new Map<string, ProductSummary>();
    for (const product of products) {
      map.set(product.slug, product);
    }
    return map;
  }, [products]);

  const rows = state.lines
    .map((line) => {
      const product = productBySlug.get(line.slug);
      if (!product) {
        return null;
      }
      return {
        line,
        product,
        lineTotal: product.price.amount * line.quantity,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const subtotal = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const itemCount = cartItemCount(state);
  const couponResult =
    couponsEnabled && state.couponCode
      ? applyCouponToSubtotal(state.couponCode, subtotal, state.appliedCoupon)
      : null;
  const discountAmount =
    couponResult?.ok === true ? couponResult.discountAmount : 0;
  const displayTotal = Math.max(0, subtotal - discountAmount);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:py-10">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { label: "Cart" },
        ]}
      />

      {state.lines.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Your cart is empty"
          description="Add products from the shop to continue."
          action={
            <Link href="/shop" className={buttonClassName({ size: "sm" })}>
              Browse shop
            </Link>
          }
        />
      ) : pending && rows.length === 0 ? (
        <p className="mt-10 text-body text-text-muted">Loading cart…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Cart items unavailable"
          description="Those products are no longer in the catalog. Clear the cart to start over."
          action={
            <button
              type="button"
              className={buttonClassName({ size: "sm" })}
              onClick={() => {
                void handleClearCart();
              }}
            >
              Clear cart
            </button>
          }
        />
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <section className="overflow-hidden border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-success/15 px-4 py-3">
              <p className="text-label font-semibold text-text">
                You have ({itemCount}){" "}
                {itemCount === 1 ? "item" : "items"} in your cart
              </p>
              <Link
                href="/support"
                className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
              >
                <Headset className="size-3.5" aria-hidden />
                Need Help?
              </Link>
            </div>

            <div className="flex items-center justify-end border-b border-border px-4 py-2">
              <button
                type="button"
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                })}
                onClick={() => {
                  void handleClearCart();
                }}
              >
                Delete all
              </button>
            </div>

            <ul className="divide-y divide-border">
              {rows.map(({ line, product, lineTotal }) => (
                <li
                  key={cartLineKey(line)}
                  className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    className="relative size-16 shrink-0 overflow-hidden border border-border bg-surface-muted sm:size-20"
                  >
                    <Image
                      src={product.image.src}
                      alt={product.image.alt}
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${product.slug}`}
                      className="text-label font-semibold tracking-tight text-text hover:text-primary"
                    >
                      {product.name}
                    </Link>
                    {line.colorName ? (
                      <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-muted">
                        {line.colorHex ? (
                          <span
                            aria-hidden
                            className="inline-block size-3 rounded-sm border border-black/10"
                            style={{ backgroundColor: line.colorHex }}
                          />
                        ) : null}
                        Colour: {line.colorName}
                      </p>
                    ) : null}
                    <p className="mt-1 text-caption tabular-nums text-text-muted">
                      {formatMoney(product.price)}
                    </p>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-3 sm:ml-0">
                    <div className="inline-flex h-9 items-center border border-border">
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-40"
                        aria-label={`Decrease quantity for ${product.name}`}
                        disabled={line.quantity <= 1}
                        onClick={() =>
                          setQuantity(
                            line.slug,
                            line.quantity - 1,
                            line.colorId,
                          )
                        }
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="min-w-8 text-center text-label tabular-nums text-text">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        className="inline-flex size-9 items-center justify-center text-text-muted hover:bg-surface-muted hover:text-text disabled:opacity-40"
                        aria-label={`Increase quantity for ${product.name}`}
                        disabled={line.quantity >= MAX_LINE_QTY}
                        onClick={() =>
                          setQuantity(
                            line.slug,
                            line.quantity + 1,
                            line.colorId,
                          )
                        }
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>

                    <p className="min-w-[5.5rem] text-right text-label font-semibold tabular-nums text-text">
                      {formatMoney({ amount: lineTotal })}
                    </p>

                    <button
                      type="button"
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-md text-text-muted transition-colors",
                        "hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger",
                      )}
                      aria-label={`Remove ${product.name}`}
                      title="Remove"
                      onClick={() => {
                        void handleRemove(
                          line.slug,
                          product.name,
                          line.colorId,
                        );
                      }}
                    >
                      <IconTrash className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside className="overflow-hidden border border-border bg-surface lg:sticky lg:top-24">
            <div className="border-b border-border bg-surface-muted px-5 py-3">
              <h2 className="text-label font-semibold tracking-tight text-text">
                Price Details
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="flex justify-between text-body text-text">
                <span>Sub Total</span>
                <span className="tabular-nums">
                  {formatMoney({ amount: subtotal })}
                </span>
              </p>
              <p className="flex justify-between text-body text-text">
                <span>Discount</span>
                <span className="tabular-nums">
                  {discountAmount > 0
                    ? `−${formatMoney({ amount: discountAmount })}`
                    : formatMoney({ amount: 0 })}
                </span>
              </p>
              <p className="flex justify-between border-t border-border pt-3 text-label font-semibold text-text">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatMoney({ amount: displayTotal })}
                </span>
              </p>
              {couponsEnabled ? (
                <CartCouponForm subtotal={subtotal} />
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border px-5 py-4">
              <Link
                href="/shop"
                className={buttonClassName({
                  variant: "secondary",
                  className: "w-full bg-text text-primary-foreground hover:bg-text/90",
                })}
              >
                Continue Shopping
              </Link>
              <Link
                href={checkoutHref}
                className={buttonClassName({
                  className: "w-full bg-success text-primary-foreground hover:bg-success/90",
                })}
              >
                {session ? "Checkout" : "Sign in to checkout"}
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
