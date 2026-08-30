"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { IconTrash } from "@/components/layout/chrome-icons";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { loadCartProducts } from "@/features/cart/actions";
import { CartCouponForm } from "@/features/cart/cart-coupon-form";
import { CartPaymentForm } from "@/features/cart/cart-payment-form";
import { CartShippingForm } from "@/features/cart/cart-shipping-form";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useMockCustomer } from "@/features/account/use-mock-customer";
import type { ProductSummary } from "@/lib/data";
import { cartItemCount, MAX_LINE_QTY } from "@/lib/cart/cart";
import { loginHref } from "@/lib/account/return-path";
import { applyCouponToSubtotal } from "@/lib/cart/coupons";
import { findPaymentMethod } from "@/lib/cart/payment";
import { resolveShippingRate } from "@/lib/cart/shipping";
import { formatMoney } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

export function CartView() {
  const confirm = useConfirm();
  const { session } = useMockCustomer();
  const checkoutHref = session ? "/checkout" : loginHref("/checkout");
  const { state, setQuantity, removeItem, clearCart } = useCartStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();

  async function handleClearCart() {
    const ok = await confirm({
      title: "Clear cart?",
      description: "All items on this device cart will be removed.",
      confirmLabel: "Clear cart",
      cancelLabel: "Keep items",
      tone: "danger",
    });
    if (ok) {
      clearCart();
      notifySuccess({
        title: "Cart cleared",
        description: "Your device cart is empty.",
      });
    }
  }

  async function handleRemove(slug: string, name: string) {
    const ok = await confirm({
      title: "Remove item?",
      description: name,
      confirmLabel: "Remove",
      cancelLabel: "Keep",
      tone: "danger",
    });
    if (ok) {
      removeItem(slug);
      notifySuccess({
        title: "Removed",
        description: "Item removed from this device cart.",
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
  const couponResult = state.couponCode
    ? applyCouponToSubtotal(state.couponCode, subtotal)
    : null;
  const discountAmount =
    couponResult?.ok === true ? couponResult.discountAmount : 0;
  const shippingResult = resolveShippingRate(
    state.shippingMethodId,
    state.shippingAreaId,
  );
  const shippingAmount = shippingResult.ok ? shippingResult.amount : 0;
  const displayTotal = Math.max(0, subtotal - discountAmount + shippingAmount);
  const paymentMethod = findPaymentMethod(state.paymentMethodId);

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:py-10">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { label: "Cart" },
        ]}
      />

      <header className="mt-5 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Shopping cart
          </h1>
          <p className="mt-2 text-body text-text-muted">
            {itemCount > 0
              ? `${itemCount} ${itemCount === 1 ? "item" : "items"} · display-only totals`
              : "Saved on this device · totals are display-only"}
          </p>
        </div>
        {state.lines.length > 0 ? (
          <button
            type="button"
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "text-danger hover:bg-danger/10",
            })}
            onClick={() => {
              void handleClearCart();
            }}
          >
            Clear all
          </button>
        ) : null}
      </header>

      {state.lines.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Your cart is empty"
          description="Add products from the shop. Prices shown are not charged yet."
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
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <ul className="divide-y divide-border border border-border bg-surface">
            {rows.map(({ line, product, lineTotal }) => (
              <li
                key={line.slug}
                className="relative grid gap-4 p-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5"
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="relative mx-auto aspect-square w-28 overflow-hidden bg-surface-muted sm:mx-0 sm:w-full"
                >
                  <Image
                    src={product.image.src}
                    alt={product.image.alt}
                    fill
                    sizes="120px"
                    className="object-contain p-2"
                  />
                </Link>

                <div className="min-w-0 pr-10 sm:pr-0">
                  <Link
                    href={`/product/${product.slug}`}
                    className="text-label font-semibold tracking-tight text-text hover:text-primary"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-1 text-caption text-text-muted">
                    {product.brandName} · {product.sku}
                  </p>
                  <p className="mt-2 text-caption tabular-nums text-text-muted">
                    {formatMoney(product.price)} each
                  </p>
                  <label className="mt-3 inline-flex items-center gap-2 text-caption text-text-muted">
                    Qty
                    <select
                      className="min-h-9 rounded-md border border-border bg-surface px-2.5 text-label text-text"
                      value={line.quantity}
                      onChange={(event) =>
                        setQuantity(line.slug, Number(event.target.value))
                      }
                      aria-label={`Quantity for ${product.name}`}
                    >
                      {Array.from({ length: MAX_LINE_QTY }, (_, index) => {
                        const value = index + 1;
                        return (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
                  <p className="text-label font-semibold tabular-nums text-text">
                    {formatMoney({ amount: lineTotal })}
                  </p>
                  <button
                    type="button"
                    className={cn(
                      "absolute top-3 right-3 inline-flex size-10 items-center justify-center rounded-md text-text-muted transition-colors",
                      "hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger",
                      "sm:static sm:mt-2",
                    )}
                    aria-label={`Remove ${product.name}`}
                    title="Remove"
                    onClick={() => {
                      void handleRemove(line.slug, product.name);
                    }}
                  >
                    <IconTrash className="size-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="overflow-hidden border border-border bg-surface lg:sticky lg:top-24">
            <div className="border-b border-border bg-text px-5 py-3">
              <h2 className="text-label font-semibold tracking-tight text-primary-foreground">
                Order summary
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="flex justify-between text-body text-text">
                <span>
                  Subtotal
                  <span className="ml-1 text-caption text-text-muted">
                    ({itemCount})
                  </span>
                </span>
                <span className="font-semibold tabular-nums">
                  {formatMoney({ amount: subtotal })}
                </span>
              </p>
              {discountAmount > 0 ? (
                <p className="flex justify-between text-body text-success">
                  <span>
                    Coupon
                    {state.couponCode ? (
                      <span className="ml-1 font-mono text-caption">
                        ({state.couponCode})
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">
                    −{formatMoney({ amount: discountAmount })}
                  </span>
                </p>
              ) : null}
              {shippingResult.ok ? (
                <p className="flex justify-between text-body text-text">
                  <span className="pr-2">
                    Shipping
                    <span className="mt-0.5 block text-caption text-text-muted">
                      {shippingResult.method.name}
                      {shippingResult.area
                        ? ` · ${shippingResult.area.name}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {shippingAmount === 0
                      ? "Free"
                      : formatMoney({ amount: shippingAmount })}
                  </span>
                </p>
              ) : (
                <p className="text-caption text-text-muted">
                  Choose shipping below to preview delivery cost.
                </p>
              )}
              <p className="flex justify-between border-t border-border pt-3 text-label font-semibold text-text">
                <span>Estimated total</span>
                <span className="tabular-nums">
                  {formatMoney({ amount: displayTotal })}
                </span>
              </p>
              {paymentMethod ? (
                <p className="text-caption text-text-muted">
                  Payment:{" "}
                  <span className="font-medium text-text">
                    {paymentMethod.name}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="space-y-4 border-t border-border px-5 py-4">
              <CartShippingForm />
              <CartCouponForm subtotal={subtotal} />
              <CartPaymentForm />
            </div>

            <div className="space-y-2 border-t border-border bg-surface-muted/50 px-5 py-4">
              <p className="text-caption text-text-muted">
                Display only — this total is not charged.
              </p>
              <Link
                href={checkoutHref}
                className={buttonClassName({ className: "w-full" })}
              >
                {session ? "Proceed to checkout" : "Sign in to checkout"}
              </Link>
              <Link
                href="/shop"
                className={buttonClassName({
                  variant: "ghost",
                  className: "w-full border border-border",
                })}
              >
                Continue shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
