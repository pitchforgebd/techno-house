"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { IconCart, IconTrash } from "@/components/layout/chrome-icons";
import { HeaderCountBadge } from "@/components/layout/header-count-badge";
import { HEADER_ACTION_CLASS } from "@/components/layout/header-action-class";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { loadCartProducts } from "@/features/cart/actions";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import type { ProductSummary } from "@/lib/data";
import { cartItemCount, cartLineKey } from "@/lib/cart/cart";
import { loginHref } from "@/lib/account/return-path";
import { formatMoney } from "@/lib/format/currency";

export function HeaderCart() {
  const session = useCustomerSession();
  const checkoutHref = session ? "/checkout" : loginHref("/checkout");
  const { state, removeItem } = useCartStore();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();
  const count = cartItemCount(state);

  const slugs = useMemo(
    () => state.lines.map((line) => line.slug),
    [state.lines],
  );

  useEffect(() => {
    if (!open || slugs.length === 0) {
      return;
    }
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
  }, [open, slugs]);

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

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={HEADER_ACTION_CLASS}
        data-cart-jump
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="header-cart"
        aria-label={`Cart, ${count} items`}
        onClick={() => setOpen(true)}
      >
        <IconCart />
        <HeaderCountBadge count={count} />
      </button>
      <Sheet open={open} onClose={close} title="Cart" side="right">
        <div id="header-cart" className="space-y-4">
          {state.lines.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Items you add will appear here. Totals are display-only."
              action={
                <Link
                  href="/cart"
                  className={buttonClassName({ variant: "primary" })}
                  onClick={close}
                >
                  View cart
                </Link>
              }
            />
          ) : (
            <>
              <p className="text-caption text-text-muted">
                {count} {count === 1 ? "item" : "items"} · totals display only
              </p>
              {pending && rows.length === 0 ? (
                <p className="text-body text-text-muted">Loading…</p>
              ) : (
                <ul className="space-y-3">
                  {rows.map(({ line, product, lineTotal }) => (
                    <li
                      key={cartLineKey(line)}
                      className="flex gap-3 border-b border-border pb-3 last:border-0"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-surface-muted">
                        <Image
                          src={product.image.src}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/product/${product.slug}`}
                            className="line-clamp-2 text-label font-medium text-text hover:text-primary"
                            onClick={close}
                          >
                            {product.name}
                          </Link>
                          <button
                            type="button"
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            aria-label={`Remove ${product.name}`}
                            title="Remove"
                            onClick={() =>
                              removeItem(line.slug, line.colorId)
                            }
                          >
                            <IconTrash className="size-4" />
                          </button>
                        </div>
                        {line.colorName ? (
                          <p className="mt-0.5 text-caption text-text-muted">
                            Colour: {line.colorName}
                          </p>
                        ) : null}
                        <p className="mt-1 text-caption tabular-nums text-text-muted">
                          {line.quantity} × {formatMoney(product.price)} ={" "}
                          {formatMoney({ amount: lineTotal })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="flex justify-between text-label font-semibold text-text">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {formatMoney({ amount: subtotal })}
                </span>
              </p>
              <div className="space-y-2">
                <Link
                  href="/cart"
                  className={buttonClassName({ className: "w-full" })}
                  onClick={close}
                >
                  View cart
                </Link>
                <Link
                  href={checkoutHref}
                  className={buttonClassName({
                    variant: "secondary",
                    className: "w-full",
                  })}
                  onClick={close}
                >
                  {session ? "Checkout" : "Sign in to checkout"}
                </Link>
              </div>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
