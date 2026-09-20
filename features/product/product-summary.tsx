"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  Check,
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
import { B2BApplyDialog } from "@/features/b2b/b2b-apply-dialog";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useListsStore } from "@/features/lists/use-lists-store";
import { ProductShareBar } from "@/features/product/product-share-bar";
import { RatingStars } from "@/features/product/rating-stars";
import {
  resolveB2BPricing,
  type B2BProductTerms,
} from "@/lib/b2b/pricing";
import type { B2BStatus } from "@/lib/generated/prisma/enums";
import type { Money, ProductColorOption, StockStatus } from "@/lib/data";
import type { AdminEmiConfig } from "@/lib/payments/emi-shared";
import { cartItemCount, cartLineKey } from "@/lib/cart/cart";
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
  /** Pre-sanitized on the server (page.tsx) — safe to render as-is. */
  overviewHtml: string | null;
  averageRating: number;
  reviewCount: number;
  colors: ProductColorOption[];
  selectedColorId?: string | null;
  onSelectedColorIdChange?: (colorId: string | null) => void;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  /** Digits only, wa.me-ready — same source as the floating chat widget. */
  whatsappNumber?: string | null;
  emiConfig?: AdminEmiConfig;
  isSignedIn?: boolean;
  b2bAccount?: {
    status: B2BStatus;
    company: string;
    discountPercent: number;
  } | null;
  /** Per-product wholesale terms — only passed for a verified account. */
  b2bTerms?: B2BProductTerms | null;
  viewerCount?: number | null;
};

/**
 * Inline WhatsApp link next to the B2B prompt — same brand mark and number
 * as the floating chat widget (`components/chat/storefront-chat-widget.tsx`),
 * just sized to sit in a text row instead of as a standalone round button.
 */
function WhatsAppInlineLink({ number }: { number: string }) {
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ask about wholesale pricing on WhatsApp"
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-4" fill="currentColor">
        <path d="M16.004 3C9.377 3 4 8.377 4 15.004c0 2.36.65 4.62 1.883 6.6L4 29l7.59-1.85a11.94 11.94 0 0 0 4.414.84h.005c6.627 0 12.004-5.377 12.004-12.004C28.013 8.377 22.636 3 16.004 3Zm0 21.86h-.004a9.9 9.9 0 0 1-5.05-1.386l-.362-.215-3.75.914 1-3.653-.236-.375a9.86 9.86 0 0 1-1.512-5.14c0-5.462 4.446-9.908 9.918-9.908 2.648 0 5.136 1.032 7.008 2.906a9.84 9.84 0 0 1 2.902 7.006c0 5.462-4.448 9.851-9.914 9.851Zm5.44-7.4c-.298-.15-1.762-.87-2.036-.968-.273-.1-.472-.15-.67.15-.198.298-.767.968-.94 1.167-.173.198-.347.223-.645.075-.298-.15-1.259-.464-2.398-1.48-.887-.79-1.486-1.767-1.66-2.065-.173-.298-.018-.459.13-.607.135-.134.298-.347.446-.52.15-.174.198-.298.298-.497.1-.198.05-.372-.025-.521-.075-.15-.67-1.612-.918-2.208-.242-.582-.487-.503-.67-.512l-.57-.01c-.198 0-.52.075-.792.372-.273.298-1.04 1.017-1.04 2.48 0 1.463 1.065 2.876 1.213 3.075.15.198 2.096 3.2 5.08 4.487.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.762-.72 2.01-1.416.248-.695.248-1.29.174-1.415-.075-.124-.273-.198-.571-.347Z" />
      </svg>
    </a>
  );
}

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
  overviewHtml,
  averageRating,
  reviewCount,
  colors,
  selectedColorId: selectedColorIdProp,
  onSelectedColorIdChange,
  discountStartsAt = null,
  discountEndsAt = null,
  whatsappNumber = null,
  emiConfig = {
    enabled: false,
    tenureMonths: [],
    partnerName: "",
    interestNote: "",
    minOrderAmount: 0,
    updatedAt: null,
  },
  isSignedIn = false,
  b2bAccount = null,
  b2bTerms = null,
  viewerCount = null,
}: ProductSummaryProps) {
  const router = useRouter();
  const { state: cartState, addItem } = useCartStore();
  const { state: listState, toggleWishlist, toggleCompare } = useListsStore();

  const [quantity, setQuantity] = useState(1);
  // Wholesale minimums arrive with the product, so the box starts at the
  // smallest orderable quantity rather than making the buyer discover it.
  const [minApplied, setMinApplied] = useState(1);
  const [internalColorId, setInternalColorId] = useState<string | null>(
    colors.length >= 1 ? (colors[0]?.id ?? null) : null,
  );
  const selectedColorId =
    onSelectedColorIdChange != null
      ? (selectedColorIdProp ?? null)
      : internalColorId;
  function setSelectedColorId(next: string | null) {
    if (onSelectedColorIdChange) {
      onSelectedColorIdChange(next);
    } else {
      setInternalColorId(next);
    }
  }
  const [b2bOpen, setB2bOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [compareMessage, setCompareMessage] = useState<string | null>(null);

  const unavailable = stockStatus === "out_of_stock";
  const selectedColor =
    colors.find((color) => color.id === selectedColorId) ?? null;
  const inCart = cartState.lines.some(
    (line) =>
      cartLineKey(line) ===
      cartLineKey({ slug, colorId: selectedColorId }),
  );
  const cartCount = cartItemCount(cartState);
  const onWishlist = listState.wishlist.includes(slug);
  const onCompare = listState.compare.some((entry) => entry.slug === slug);

  const b2bActive = b2bAccount?.status === "ACTIVE";
  // A per-product wholesale row wins over the account's flat discount; only a
  // verified account sees either.
  const b2bPricing = b2bActive
    ? resolveB2BPricing({
        retail: price,
        discountPercent: b2bAccount?.discountPercent ?? 0,
        terms: b2bTerms,
      })
    : null;
  const minQuantity = b2bPricing?.minQuantity ?? 1;
  const displayPrice = b2bPricing ? b2bPricing.price : price;
  const retailReference = b2bActive ? price : compareAtPrice;
  const savings =
    retailReference && retailReference.amount > displayPrice.amount
      ? retailReference.amount - displayPrice.amount
      : null;
  const emiAmount = Math.max(1, Math.round(displayPrice.amount / 12));
  const emiOfferAmount = Math.max(1, Math.round(displayPrice.amount / 11));
  const emiVisible =
    emiConfig.enabled &&
    emiConfig.tenureMonths.length > 0 &&
    displayPrice.amount >= emiConfig.minOrderAmount;

  if (minApplied !== minQuantity) {
    setMinApplied(minQuantity);
    if (quantity < minQuantity) {
      setQuantity(minQuantity);
    }
  }

  function handleAddToCart() {
    if (unavailable) {
      notifyError({
        title: "Out of stock",
        description: "This item cannot be added while it is out of stock.",
      });
      return;
    }
    if (colors.length > 0 && !selectedColor) {
      notifyError({
        title: "Choose a colour",
        description: "Select a colour before adding this product to cart.",
      });
      return;
    }
    if (quantity < minQuantity) {
      notifyError({
        title: "Below the wholesale minimum",
        description: `This product ships in wholesale lots of ${minQuantity} or more.`,
      });
      setQuantity(minQuantity);
      return;
    }
    const qty = Math.min(99, Math.max(minQuantity, quantity));
    void addItem(slug, qty, {
      colorId: selectedColor?.id ?? null,
      colorName: selectedColor?.name ?? null,
      colorHex: selectedColor?.hex ?? null,
    }).then((result) => {
      if (!result.ok) {
        notifyError({
          title: "Could not add to cart",
          description: result.reason,
        });
        return;
      }
      setJustAdded(true);
      notifyAddedToCart(() => router.push("/cart"));
    });
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight text-text sm:text-3xl">
            {name}
          </h1>
          <div className="mt-2">
            <RatingStars rating={averageRating} reviewCount={reviewCount} />
          </div>
          <p className="mt-2 text-caption text-text-muted">
            Product ID: <span className="font-mono text-text">{sku}</span>
            <span className="mx-2 text-border">·</span>
            {brandName}
          </p>
        </div>

        <div className="space-y-3">
          {/* Special price sits in its own panel and the regular price on a
              plain line beneath it, rather than struck through beside it —
              the two figures read as separate facts that way, which is how
              a shopper compares them. */}
          <div className="inline-flex min-w-[13rem] flex-col gap-1 rounded-lg border border-border bg-surface-muted/60 px-5 py-4">
            <span className="text-[0.7rem] font-bold tracking-[0.14em] text-text-muted uppercase">
              {b2bActive ? "Wholesale price" : "Special price"}
            </span>
            <span className="text-[2rem] leading-none font-bold tabular-nums tracking-tight text-text">
              {formatMoney(displayPrice)}
            </span>
          </div>

          {retailReference && retailReference.amount > displayPrice.amount ? (
            <div className="space-y-0.5">
              <p className="text-caption font-medium text-text-muted">
                Regular price
              </p>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-label tabular-nums text-text-muted line-through">
                  {formatMoney(retailReference)}
                </span>
                {savings !== null ? (
                  <span className="inline-flex items-center rounded-full bg-success/12 px-2.5 py-1 text-caption font-bold text-success">
                    Save {formatMoney({ amount: savings })}
                    {b2bActive ? " (B2B)" : ""}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {discountEndsAt ? (
            <p className="text-caption text-text-muted">
              Offer until{" "}
              {new Date(discountEndsAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          ) : discountStartsAt ? (
            <p className="text-caption text-text-muted">
              Offer from{" "}
              {new Date(discountStartsAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          ) : null}

          {emiVisible ? (
            <p className="text-caption font-semibold tabular-nums text-text">
              EMI {formatMoney({ amount: emiAmount })}/month
              <span className="font-normal text-text-muted">
                {emiConfig.tenureMonths.length > 0
                  ? ` for ${Math.min(...emiConfig.tenureMonths)}–${Math.max(...emiConfig.tenureMonths)} months`
                  : ""}
                {emiConfig.partnerName ? ` via ${emiConfig.partnerName}` : ""}
              </span>
            </p>
          ) : null}

          <div className="pt-1">
            {b2bActive ? (
              <span className="text-label font-bold text-primary">
                Wholesale pricing active — {b2bAccount?.company}
              </span>
            ) : b2bAccount?.status === "PENDING" ? (
              <span className="text-label font-bold text-text-muted">
                Your wholesale application is under review.
              </span>
            ) : !isSignedIn ? (
              // Wholesale has its own entry point — the customer login sent
              // B2B buyers to a retail form with no way to register a business.
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body font-bold text-text-muted">
                  <Link
                    href="/b2b/register"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    For B2B — register for wholesale price
                  </Link>
                  {" · "}
                  <Link
                    href="/b2b/login"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Sign in
                  </Link>
                </span>
                {whatsappNumber ? (
                  <WhatsAppInlineLink number={whatsappNumber} />
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setB2bOpen(true)}
                  className="text-body font-bold text-primary underline-offset-2 hover:underline"
                >
                  {b2bAccount?.status === "SUSPENDED"
                    ? "Wholesale account suspended — re-apply"
                    : "For B2B — apply for wholesale price"}
                </button>
                {whatsappNumber ? (
                  <WhatsAppInlineLink number={whatsappNumber} />
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isNew ? (
            <Badge tone="new" size="md">
              New
            </Badge>
          ) : null}
          {isSale || savings !== null ? (
            <Badge tone="sale" size="md">
              Sale
            </Badge>
          ) : null}
          {b2bActive ? (
            <Badge tone="neutral" size="md">
              Wholesale
            </Badge>
          ) : null}
          <Badge
            tone={stockStatus === "in_stock" ? "stock" : "neutral"}
            size="md"
          >
            {STOCK_LABEL[stockStatus]}
          </Badge>
        </div>

        {viewerCount != null ? (
          <p className="flex items-center gap-1.5 text-caption text-text-muted">
            <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden />
            {viewerCount} {viewerCount === 1 ? "person is" : "people are"} viewing this right now
          </p>
        ) : null}

        {colors.length > 0 ? (
          <div className="space-y-2">
            <h2 className="text-label font-semibold text-text">
              Color variations
            </h2>
            <div
              className="space-y-2"
              role="listbox"
              aria-label="Product colour"
            >
              {colors.map((color) => {
                const selected = color.id === selectedColorId;
                const swatch = color.hex ?? "#d4d4d4";
                return (
                  <button
                    key={color.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    title={color.name}
                    className={cn(
                      "flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-surface hover:border-primary/40",
                    )}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      setJustAdded(false);
                    }}
                  >
                    <span
                      aria-hidden
                      className="size-8 shrink-0 rounded-full border border-black/10"
                      style={{ backgroundColor: swatch }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-label font-medium text-text">
                        {color.name}
                      </span>
                      <span className="block text-caption tabular-nums text-text-muted">
                        {formatMoney(displayPrice)}
                      </span>
                    </span>
                    {selected ? (
                      <Check
                        aria-hidden
                        className="size-4 shrink-0 text-primary"
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

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

        {overviewHtml ? (
          <div>
            <h2 className="text-label font-semibold uppercase tracking-wide text-text">
              Quick overview
            </h2>
            <div
              className="th-rich-text mt-2 text-label text-text-muted"
              dangerouslySetInnerHTML={{ __html: overviewHtml }}
            />
          </div>
        ) : null}

        {minQuantity > 1 ? (
          <p className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-caption font-medium text-text">
            Wholesale minimum order:{" "}
            <span className="tabular-nums">{minQuantity}</span> pieces
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-5">
          <div className="w-20">
            <label
              htmlFor="product-qty"
              className="text-caption text-text-muted"
            >
              Qty
            </label>
            <Input
              id="product-qty"
              type="number"
              min={minQuantity}
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
              notifyToast(nextOn ? "Added to compare" : "Removed from compare");
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
              notifyToast(
                nextOn ? "Added to wishlist" : "Removed from wishlist",
              );
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
              <span className="tabular-nums">
                {" "}
                · {cartCount} items (display only)
              </span>
            ) : null}
          </p>
        ) : null}

        {emiVisible ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface px-3.5 py-3">
              <p className="text-label font-semibold text-text">
                Avail EMI offer
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {emiConfig.partnerName
                  ? `Through ${emiConfig.partnerName}.`
                  : "Through our partner banks."}{" "}
                {emiConfig.interestNote}
              </p>
            </div>
            <div className="rounded-lg border border-primary/25 bg-primary-soft/60 px-3.5 py-3">
              <p className="text-label font-semibold tabular-nums text-text">
                From {formatMoney({ amount: emiOfferAmount })}/month
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {emiConfig.tenureMonths.map((m) => `${m} months`).join(" · ")}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              label: "Payment method",
              href: "/checkout",
              note: "SSLCommerz, bKash, Nagad, and cash on delivery.",
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
              className="group/info flex gap-2.5 rounded-lg border border-border bg-surface p-3 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-sm"
            >
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors group-hover/info:bg-primary group-hover/info:text-primary-foreground">
                <item.Icon
                  aria-hidden
                  className="size-4"
                  strokeWidth={1.75}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-caption font-bold text-text">
                  {item.label}
                </span>
                {/* The note used to live in a `title` tooltip — invisible on
                    touch and to most people. */}
                <span className="mt-0.5 block text-[0.7rem] leading-snug text-text-muted">
                  {item.note}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <ProductShareBar productName={name} />

        <p className="text-caption text-text-muted">
          {warrantyLabel}. Prices in ৳ are display-only and are not a charge.
        </p>
      </div>

      <B2BApplyDialog open={b2bOpen} onClose={() => setB2bOpen(false)} />
    </>
  );
}
