"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  ClipboardList,
  CreditCard,
  Heart,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  notifyAddedToCart,
  notifyError,
  notifySuccess,
  notifyToast,
} from "@/components/ui/feedback-provider";
import { Input } from "@/components/ui/input";
import { B2BAuthDialog } from "@/features/b2b/b2b-auth-dialog";
import { useB2BSession } from "@/features/b2b/use-b2b-session";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useListsStore } from "@/features/lists/use-lists-store";
import { ProductShareBar } from "@/features/product/product-share-bar";
import { RatingStars } from "@/features/product/rating-stars";
import { wholesalePriceFromRetail } from "@/lib/b2b/wholesale-price";
import { cartItemCount } from "@/lib/cart/cart";
import type { Money, SpecChip, StockStatus } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

const STOCK_LABEL: Record<StockStatus, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

type ProductSummaryProps = {
  slug: string;
  categorySlug: string;
  brandName: string;
  sku: string;
  name: string;
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
  isNew: boolean;
  isSale: boolean;
  warrantyLabel: string;
  overview: string[];
  specs: SpecChip[];
  averageRating: number;
};

function WishlistHeartIcon({ filled }: { filled: boolean }) {
  return (
    <Heart
      aria-hidden
      strokeWidth={1.75}
      className={cn(
        "size-5",
        filled ? "fill-danger text-danger" : "fill-none text-text",
      )}
    />
  );
}

export function ProductSummary({
  slug,
  categorySlug,
  brandName,
  sku,
  name,
  price,
  compareAtPrice,
  stockStatus,
  isNew,
  isSale,
  warrantyLabel,
  overview,
  specs,
  averageRating,
}: ProductSummaryProps) {
  const router = useRouter();
  const { session: b2bSession, signOut } = useB2BSession();
  const { state: cartState, addItem } = useCartStore();
  const { state: listState, toggleWishlist, toggleCompare } = useListsStore();

  const [quantity, setQuantity] = useState(1);
  const [b2bOpen, setB2bOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);

  const unavailable = stockStatus === "out_of_stock";
  const inCart = cartState.lines.some((line) => line.slug === slug);
  const cartCount = cartItemCount(cartState);
  const onWishlist = listState.wishlist.includes(slug);
  const onCompare = listState.compare.some((entry) => entry.slug === slug);

  const wholesale = wholesalePriceFromRetail(price);
  const displayPrice = b2bSession ? wholesale : price;
  const retailReference = b2bSession ? price : compareAtPrice;
  const savings =
    retailReference && retailReference.amount > displayPrice.amount
      ? retailReference.amount - displayPrice.amount
      : null;
  const emiAmount = Math.max(1, Math.round(displayPrice.amount / 12));
  const emiOfferAmount = Math.max(1, Math.round(displayPrice.amount / 11));

  const quickSpecs = specs.slice(0, 6);
  const quickLines = [
    ...overview,
    ...quickSpecs.map((spec) => `${spec.label} - ${spec.value}`),
  ];

  function handleAddToCart() {
    if (unavailable) {
      notifyError({
        title: "Out of stock",
        description: "This item cannot be added while it is out of stock.",
      });
      return;
    }
    const qty = Math.min(99, Math.max(1, quantity));
    addItem(slug, qty);
    setJustAdded(true);
    notifyAddedToCart(() => router.push("/cart"));
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight text-text sm:text-3xl">
            {name}
          </h1>
          <div className="mt-2">
            <RatingStars rating={averageRating} />
          </div>
          <p className="mt-2 text-caption text-text-muted">
            Product ID: <span className="font-mono text-text">{sku}</span>
            <span className="mx-2 text-border">·</span>
            {brandName}
          </p>
        </div>

        <div className="space-y-2 border-y border-border py-5">
          <div className="inline-flex min-w-[11rem] flex-col border border-border bg-surface-muted/80 px-4 py-3">
            <span className="text-caption font-medium uppercase tracking-wide text-text-muted">
              {b2bSession ? "Wholesale price" : "Special price"}
            </span>
            <span className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-text">
              {formatMoney(displayPrice)}
            </span>
          </div>

          {savings !== null ? (
            <p className="text-label font-semibold text-info">
              Save extra {formatMoney({ amount: savings })}
              {b2bSession ? " with B2B pricing" : " on various offers"}
            </p>
          ) : null}

          {retailReference && retailReference.amount > displayPrice.amount ? (
            <p className="text-label text-text-muted">
              Regular price{" "}
              <span className="tabular-nums line-through">
                {formatMoney(retailReference)}
              </span>
            </p>
          ) : null}

          <p className="text-caption tabular-nums text-text-muted">
            EMI {formatMoney({ amount: emiAmount })}/month · display only
          </p>

          <div className="pt-1">
            {b2bSession ? (
              <div className="flex flex-wrap items-center gap-2 text-caption">
                <span className="font-medium text-primary">
                  B2B: {b2bSession.shopName}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    notifySuccess({
                      title: "Signed out of B2B",
                      description: "Retail prices are shown again.",
                    });
                  }}
                  className="text-text-muted underline-offset-2 hover:text-primary hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setB2bOpen(true)}
                className="text-label font-medium text-primary underline-offset-2 hover:underline"
              >
                For B2B — register or sign in for wholesale price
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {isNew ? <Badge tone="new">New</Badge> : null}
          {isSale || savings !== null ? <Badge tone="sale">Sale</Badge> : null}
          {b2bSession ? <Badge tone="neutral">Wholesale</Badge> : null}
          <Badge tone={stockStatus === "in_stock" ? "stock" : "neutral"}>
            {STOCK_LABEL[stockStatus]}
          </Badge>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          className="w-full sm:w-auto sm:min-w-[12rem]"
          onClick={() =>
            notifySuccess({
              title: STOCK_LABEL[stockStatus],
              description: `${warrantyLabel}. Branch stock checks are display-only in this build.`,
            })
          }
        >
          Check availability
        </Button>

        {quickLines.length > 0 ? (
          <div>
            <h2 className="text-label font-semibold uppercase tracking-wide text-text">
              Quick overview
            </h2>
            <ul className="mt-2 space-y-1.5 text-label text-text-muted">
              {quickLines.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-primary">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-5">
          <div className="w-20">
            <label htmlFor="product-qty" className="text-caption text-text-muted">
              Qty
            </label>
            <Input
              id="product-qty"
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(event) =>
                setQuantity(Number.parseInt(event.target.value, 10) || 1)
              }
              className="mt-1 h-10 text-center tabular-nums"
            />
          </div>
          <button
            type="button"
            disabled={unavailable}
            className={buttonClassName({
              size: "md",
              className: "min-h-11 min-w-[10rem] flex-1 gap-2 sm:flex-none",
            })}
            onClick={handleAddToCart}
          >
            <ShoppingCart aria-hidden className="size-4" strokeWidth={1.75} />
            {unavailable
              ? "Out of stock"
              : justAdded || inCart
                ? "Added to cart"
                : "Add to cart"}
          </button>
          <button
            type="button"
            aria-pressed={onCompare}
            className={buttonClassName({
              variant: "ghost",
              size: "md",
              className: "min-h-11 gap-2 border border-border px-5",
            })}
            onClick={() => {
              const result = toggleCompare(slug, categorySlug);
              if (!result.ok) {
                setCompareMessage(result.reason);
                notifyError({ title: "Compare", description: result.reason });
                return;
              }
              setCompareMessage(null);
              const nextOn = !onCompare;
              notifyToast(
                nextOn ? "Added to compare" : "Removed from compare",
              );
            }}
          >
            <ArrowLeftRight aria-hidden className="size-4" strokeWidth={1.75} />
            {onCompare ? "In compare" : "Compare"}
          </button>
          <button
            type="button"
            aria-label={onWishlist ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={onWishlist}
            className={buttonClassName({
              variant: "ghost",
              size: "md",
              className: "min-h-11 min-w-11 border border-border px-0",
            })}
            onClick={() => {
              const nextOn = !onWishlist;
              toggleWishlist(slug);
              notifyToast(nextOn ? "Added to wishlist" : "Removed from wishlist");
            }}
          >
            <WishlistHeartIcon filled={onWishlist} />
          </button>
        </div>

        {compareMessage ? (
          <p className="text-caption text-danger" role="status">
            {compareMessage}
          </p>
        ) : null}

        {justAdded || inCart ? (
          <p className="text-caption text-text-muted">
            <Link
              href="/cart"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              View cart
            </Link>
            {cartCount > 0 ? (
              <span className="tabular-nums"> · {cartCount} items (display only)</span>
            ) : null}
          </p>
        ) : null}

        <div className="rounded-md border border-border bg-surface-muted/50 px-3 py-3">
          <label className="flex cursor-pointer items-start gap-2 text-label text-text">
            <input type="checkbox" className="mt-0.5 accent-primary" />
            <span>
              Avail EMI offer{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() =>
                  notifySuccess({
                    title: "EMI plans",
                    description: "EMI plans are display-only in this build.",
                  })
                }
              >
                View plans
              </button>
            </span>
          </label>
          <p className="mt-2 text-caption tabular-nums text-text-muted">
            EMI starts from {formatMoney({ amount: emiOfferAmount })}/month
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              label: "Payment method",
              href: "/checkout",
              note: "SSLCommerz, bKash, and cash on delivery (mock).",
              Icon: CreditCard,
            },
            {
              label: "Shipping & charge",
              href: "/shipping",
              note: "Dhaka delivery, nationwide courier, and store pickup zones.",
              Icon: Truck,
            },
            {
              label: "Order procedure",
              href: "/faq",
              note: "Browse, cart, checkout, and confirmation — display-only flow.",
              Icon: ClipboardList,
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-muted/60 px-3 text-center text-caption font-medium text-text transition-colors hover:border-primary/40 hover:bg-surface"
              title={item.note}
            >
              <item.Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </Link>
          ))}
        </div>

        <ProductShareBar productName={name} />

        <p className="text-caption text-text-muted">
          {warrantyLabel}. Prices in ৳ are display-only and are not a charge.
        </p>
      </div>

      <B2BAuthDialog open={b2bOpen} onClose={() => setB2bOpen(false)} />
    </>
  );
}
