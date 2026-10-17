"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Heart,
  ShieldCheck,
  ShoppingCart,
  Tag,
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
import { ProductEmiTooltip } from "@/features/product/product-emi-tooltip";
import { ProductServiceCards } from "@/features/product/product-service-cards";
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
  /** Manufacturer model number, shown in the info chip row under the title. */
  modelNumber?: string | null;
  /** Not yet stocked but launching soon — hides the price and replaces Add to
   * cart with a single disabled "Up Coming" button. */
  isComingSoon?: boolean;
  /** Orderable ahead of stock arriving — keeps the price, relabels Add to
   * cart "Place Pre Order", and is never disabled by `stockStatus`. */
  isPreOrder?: boolean;
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
  /**
   * The summary renders as TWO sibling boxes — the buy information and, on large
   * screens, the colour options — so the page grid can place them in separate
   * columns. These classes position the boxes in that grid.
   */
  infoClassName?: string;
  optionsClassName?: string;
  /**
   * Where the delivery cards sit on large screens: "info" keeps them in the buy
   * box, "options" puts them under the colours in the right-hand column (from
   * `xl`, where that column exists; between `lg` and `xl` the page shows them
   * under the gallery instead), "gallery" leaves them to the page, which renders
   * them under the gallery (from `lg`). Below `lg` they are always in the buy box.
   * The page picks whichever keeps its columns about the same height.
   */
  serviceCardsAt?: "info" | "options" | "gallery";
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
  modelNumber = null,
  isComingSoon = false,
  isPreOrder = false,
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
  infoClassName,
  optionsClassName,
  serviceCardsAt = "info",
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
  // "Avail EMI offer" — carried into the cart line (and from there, the
  // order) when this item is added, so staff can see the request and
  // arrange EMI with the partner bank manually; no gateway processes it.
  const [emiSelected, setEmiSelected] = useState(false);

  // A pre-order item is "out of stock" by definition — that's the whole
  // point — so it must bypass the disable that out-of-stock normally means.
  const unavailable = stockStatus === "out_of_stock" && !isPreOrder;
  // Up Coming: no price exists to quote yet. Out of stock (and not a
  // pre-order): the listed price is not currently honourable. Either way,
  // nothing price-shaped should render — the card, the savings pill, the
  // discount-date line, and the EMI figure all key off this.
  const priceHidden = isComingSoon || unavailable;
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
  const discountPercent =
    savings !== null && retailReference
      ? Math.round((savings / retailReference.amount) * 100)
      : null;
  // One monthly figure per configured tenure, longest first — the longest
  // tenure is the smallest monthly, which is the figure quoted in the buy
  // box ("EMI ৳X/month") and the one a shopper compares on. This used to
  // divide by a hardcoded 12 (and, for the offer box, by 11) regardless of
  // what the admin had actually configured.
  const emiPlans = [...emiConfig.tenureMonths]
    .sort((left, right) => right - left)
    .map((months) => ({
      months,
      monthly: Math.max(1, Math.round(displayPrice.amount / months)),
    }));
  const emiLowestMonthly = emiPlans[0]?.monthly ?? 0;
  const emiVisible =
    !priceHidden &&
    emiConfig.enabled &&
    emiPlans.length > 0 &&
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
    void addItem(
      slug,
      qty,
      {
        colorId: selectedColor?.id ?? null,
        colorName: selectedColor?.name ?? null,
        colorHex: selectedColor?.hex ?? null,
      },
      emiSelected,
    ).then((result) => {
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

  function checkAvailability() {
    notifySuccess({
      title: STOCK_LABEL[stockStatus],
      description: `${warrantyLabel}. Branch stock checks are display-only in this build.`,
    });
  }

  // One element, rendered in two places (see `lg:hidden` / `hidden lg:block`
  // below); only one of them is ever displayed, and both share this state.
  const colorVariations =
    colors.length > 0 ? (
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
    ) : null;

  return (
    <>
      <div className={cn("@container space-y-4", infoClassName)}>
        <div>
          {/* One size down from before, and semibold rather than carrying its
              own bold weight — the price below is now the boldest, biggest
              thing in the column, and the title reads as a heading over it
              rather than competing with it (AD-371, "more minimal"). */}
          <h1 className="text-balance text-lg leading-snug font-semibold tracking-tight text-text sm:text-xl">
            {name}
          </h1>
          {/* One merged meta row — rating, stock, model, SKU, brand — rather
              than a rating line followed by a second row of plain grey boxes.
              The Stock pill turns bold red when out of stock, which is also
              what covers the user's separate "Out Of Stock likha ta... show
              korbe" ask — one prominent place for it rather than a second
              standalone banner. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <RatingStars rating={averageRating} reviewCount={reviewCount} />
            <span className="h-4 w-px bg-border" aria-hidden />
            {/* Bigger (size="md") than a typical caption chip, on request —
                these should catch the eye, not read as fine print. */}
            <Badge
              tone={
                unavailable
                  ? "sale"
                  : stockStatus === "in_stock"
                    ? "stock"
                    : "neutral"
              }
              size="md"
              className={unavailable ? "font-bold" : undefined}
            >
              {unavailable ? "Out Of Stock" : STOCK_LABEL[stockStatus]}
            </Badge>
            {modelNumber ? (
              <Badge tone="neutral" size="md">
                Model:{" "}
                <span className="ml-1 font-semibold text-text">
                  {modelNumber}
                </span>
              </Badge>
            ) : null}
            <Badge tone="neutral" size="md">
              SKU:{" "}
              <span className="ml-1 font-mono font-semibold text-text">
                {sku}
              </span>
            </Badge>
            <Badge tone="warranty" size="md">
              Brand: <span className="ml-1 font-semibold">{brandName}</span>
            </Badge>
          </div>
        </div>

        {/* No price exists to quote for an Up Coming product, and an
            out-of-stock (non-pre-order) price is not currently honourable —
            see `priceHidden`. */}
        {!priceHidden ? (
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-surface-muted/70 via-primary-soft/20 to-surface p-4 shadow-sm sm:p-5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              {/* Special and regular price sit on one line, both bold, the
                  special price a size larger — no bordered panel is what made
                  the old version feel boxed-in rather than minimal; this one
                  keeps that single-line price but gives it a card so the offer
                  badge and the pulsing dot have somewhere to sit. */}
              <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-extrabold tracking-[0.14em] text-primary uppercase">
                <span
                  className="size-2 animate-pulse rounded-full bg-primary"
                  aria-hidden
                />
                {b2bActive ? "Wholesale price" : "Special price"}
              </span>
              {discountEndsAt ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 text-[0.65rem] font-bold text-danger">
                  <span
                    className="size-1.5 animate-ping rounded-full bg-danger"
                    aria-hidden
                  />
                  Limited Time Offer
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[1.875rem] leading-none font-bold tabular-nums tracking-tight text-text sm:text-[2.25rem]">
                  {formatMoney(displayPrice)}
                </span>
                {retailReference && retailReference.amount > displayPrice.amount ? (
                  <span className="text-[1.25rem] leading-none font-bold tabular-nums text-text-muted line-through sm:text-[1.5rem]">
                    {formatMoney(retailReference)}
                  </span>
                ) : null}
                {savings !== null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-caption font-bold text-success">
                    Save {formatMoney({ amount: savings })}
                    {discountPercent !== null ? ` (${discountPercent}% OFF)` : ""}
                    {b2bActive ? " · B2B" : ""}
                  </span>
                ) : null}
              </div>

              {/* Universal — shown on every product regardless of whether
                  it has its own B2BProductPrice row, since an active B2B
                  account still gets its flat account-level discount on any
                  product (resolveB2BPricing's fallback); gating this on
                  per-product eligibility hid the register/sign-in entry
                  point in exactly the cases where it still works. Sits
                  opposite the price on this same row per the operator's
                  own screenshot. */}
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  aria-hidden
                >
                  <Tag className="size-5" strokeWidth={1.75} />
                </span>
                {b2bActive ? (
                  <span className="text-label font-bold text-primary">
                    Wholesale pricing active — {b2bAccount?.company}
                  </span>
                ) : b2bAccount?.status === "PENDING" ? (
                  <span className="text-label font-bold text-text-muted">
                    Your wholesale application is under review.
                  </span>
                ) : !isSignedIn ? (
                  // Wholesale has its own entry point — the customer
                  // login sent B2B buyers to a retail form with no way
                  // to register a business.
                  <span className="text-label font-bold text-text-muted">
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
                ) : (
                  <button
                    type="button"
                    onClick={() => setB2bOpen(true)}
                    className="text-label font-bold text-primary underline-offset-2 hover:underline"
                  >
                    {b2bAccount?.status === "SUSPENDED"
                      ? "Wholesale account suspended — re-apply"
                      : "For B2B — apply for wholesale price"}
                  </button>
                )}
                {whatsappNumber && !b2bActive ? (
                  <WhatsAppInlineLink number={whatsappNumber} />
                ) : null}
              </span>
            </div>
          </div>
        ) : null}

        {/* Quick overview right under the price (AD-371) — the operator's own
            words were "price er nichei Quick overview hobe". It used to sit
            after the cart controls (AD-362), specifically so a long one could
            never push Add to cart down; it is ordinarily a short few bullets
            (the admin field says so: "Keep it short"), so this is a deliberate
            trade — a product with an unusually long overview will push the
            cart row down, which AD-362's own notes already flagged as a
            standing limit of a flexible-height buy column. The body stays
            rich text (our system), not the reference's spec-grid layout —
            only the header/card treatment follows the reference. */}
        <div className="border-y border-border py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-4 w-1.5 rounded-full bg-primary" aria-hidden />
            <h2 className="text-label font-bold uppercase tracking-wide text-text">
              Quick Overview
            </h2>
          </div>
          {overviewHtml ? (
            <div
              className="th-rich-text mt-3 text-label text-text-muted"
              dangerouslySetInnerHTML={{ __html: overviewHtml }}
            />
          ) : null}
          {/* Below the overview content, not beside the header — the
              operator's own instruction. Jumps to the Specifications
              section: ProductDetailSections marks it with
              data-product-section="specifications" and already tracks
              scroll position via its own IntersectionObserver, so this
              needs no wiring beyond a plain scrollIntoView. */}
          <button
            type="button"
            onClick={() => {
              document
                .querySelector('[data-product-section="specifications"]')
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="mt-3 text-label font-semibold text-danger underline-offset-2 hover:underline"
          >
            View More Info
          </button>
        </div>

        <div className="space-y-2">
          {!priceHidden && discountEndsAt ? (
            <p className="text-caption text-text-muted">
              Offer until{" "}
              {new Date(discountEndsAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          ) : !priceHidden && discountStartsAt ? (
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

          {/* EMI promo bar — the B2B prompt that used to share this bar now
              lives beside the price above (universal, every product), so
              this bar is EMI-only: a "View Plans" entry point on one side,
              the lowest monthly figure on the other. */}
          {emiVisible ? (
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-border bg-surface-muted px-3.5 py-2.5 text-caption">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <ProductEmiTooltip
                  label="Avail EMI offer · View Plans"
                  plans={emiPlans}
                  note={emiConfig.interestNote || undefined}
                  triggerClassName="text-label font-semibold text-text underline underline-offset-4 decoration-dotted hover:text-primary"
                />
                {emiConfig.partnerName ? (
                  <span className="text-text-muted">
                    via {emiConfig.partnerName}
                  </span>
                ) : null}
              </span>
              <span className="text-label font-semibold tabular-nums text-text-muted">
                EMI starts from {formatMoney({ amount: emiLowestMonthly })}
                /month
              </span>
            </div>
          ) : null}
        </div>

        {/* Stock status already has its own pill in the merged meta row
            under the title — showing it a second time here would be
            clutter, so this row is just the merchandising flags. */}
        {isNew || isSale || savings !== null || b2bActive ? (
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
          </div>
        ) : null}

        {viewerCount != null ? (
          <p className="flex items-center gap-1.5 text-caption text-text-muted">
            <span className="size-2 animate-pulse rounded-full bg-danger" aria-hidden />
            {viewerCount} {viewerCount === 1 ? "person is" : "people are"} viewing this right now
          </p>
        ) : null}

        {/* Below `xl` the colour options stay in the buy box, before the cart
            controls; from `xl` they move to their own column (see below). */}
        {colorVariations ? <div className="xl:hidden">{colorVariations}</div> : null}

        {minQuantity > 1 ? (
          <p className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-caption font-medium text-text">
            Wholesale minimum order:{" "}
            <span className="tabular-nums">{minQuantity}</span> pieces
          </p>
        ) : null}

        {/* Plain bold red status text directly above the purchase row/button
            — matches the reference exactly, rather than the pill badge this
            used to be. */}
        {isComingSoon ? (
          <p className="text-body font-extrabold text-danger">Up Coming</p>
        ) : isPreOrder ? (
          <p className="text-body font-extrabold text-danger">Pre Order</p>
        ) : null}

        {isComingSoon ? (
          /* Matches the reference exactly: nothing but one disabled button —
             no qty stepper, no branch-stock lookup, no Compare/Wishlist, none
             of which apply to something that cannot be bought yet. */
          <div className="border-t border-border pt-4">
            <button
              type="button"
              disabled
              className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-sm border border-border bg-surface-muted font-medium text-text-muted"
            >
              Up Coming
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
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
                  className: "min-h-11 min-w-[7rem] flex-1 gap-2 sm:flex-none",
                })}
                onClick={handleAddToCart}
              >
                <ShoppingCart aria-hidden className="size-4" strokeWidth={1.75} />
                {unavailable
                  ? "Out of stock"
                  : isPreOrder
                    ? "Place Pre Order"
                    : justAdded || inCart
                      ? "Added to cart"
                      : "Add to cart"}
              </button>
              {/* Desktop-only: folded into the same row as the cart controls so
                  it stops being a second, separate full-width button below (the
                  mobile fallback right after this row keeps it reachable there). */}
              {/* The visibility toggle lives on this wrapper, not on the Button's
                  own className — buttonClassName() already hardcodes `inline-flex`
                  with no breakpoint, and `cn()` has no tailwind-merge, so a
                  `hidden sm:inline-flex` passed alongside it is not guaranteed to
                  win the cascade (the exact pitfall the `light` variant comment
                  above warns about). */}
              <div className="hidden sm:block">
                <Button
                  type="button"
                  variant="ink"
                  size="md"
                  className="min-h-11 gap-1.5"
                  onClick={checkAvailability}
                >
                  <ShieldCheck aria-hidden className="size-4" strokeWidth={1.75} />
                  Check availability
                </Button>
              </div>
              <button
                type="button"
                aria-pressed={onCompare}
                aria-label={onCompare ? "In compare" : "Compare"}
                title={onCompare ? "In compare" : "Compare"}
                className={buttonClassName({
                  variant: "ghost",
                  size: "md",
                  className: "min-h-11 gap-2 border border-border px-3",
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
                {/* The label drops out when the buy column is too narrow to fit the
                    whole row (it keeps its accessible name via aria-label). */}
                <span className="hidden @[27rem]:inline">
                  {onCompare ? "In compare" : "Compare"}
                </span>
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

            {/* Mobile fallback for the same action, hidden on the row above from `sm`. */}
            <Button
              type="button"
              variant="ink"
              size="md"
              className="w-full gap-1.5 sm:hidden"
              onClick={checkAvailability}
            >
              <ShieldCheck aria-hidden className="size-4" strokeWidth={1.75} />
              Check availability
            </Button>
          </>
        )}

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
          <div className="space-y-1.5 rounded-lg border border-border bg-surface px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
              <label className="flex items-center gap-2 text-label font-semibold text-text">
                <input
                  type="checkbox"
                  checked={emiSelected}
                  onChange={(event) => setEmiSelected(event.target.checked)}
                  className="size-4 rounded-sm border-border accent-primary"
                />
                Avail EMI offer
                <ProductEmiTooltip
                  label="View Plans"
                  plans={emiPlans}
                  note={emiConfig.interestNote || undefined}
                  triggerClassName="text-label font-semibold text-primary underline-offset-2 hover:underline"
                />
              </label>
              <p className="text-caption tabular-nums text-text-muted">
                EMI starts from {formatMoney({ amount: emiLowestMonthly })}
                /month
              </p>
            </div>
            {emiSelected ? (
              <p className="text-caption text-success">
                Noted — we&apos;ll arrange your EMI
                {emiConfig.partnerName ? ` with ${emiConfig.partnerName}` : ""}{" "}
                after checkout.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* The delivery cards: in the buy box below `lg`, and from `lg` wherever
            `serviceCardsAt` says (here, under the colours, or under the gallery). */}
        <div
          className={
            serviceCardsAt === "info"
              ? undefined
              : "lg:hidden"
          }
        >
          <ProductServiceCards />
        </div>

        <ProductShareBar productName={name} />

        <p className="text-caption text-text-muted">
          {warrantyLabel}. Prices in ৳ are display-only and are not a charge.
        </p>
      </div>

      {colorVariations ? (
        // With colours the right-hand column is otherwise short, so the page may
        // put the delivery cards under them (`serviceCardsAt="options"`).
        <div className={cn("hidden space-y-5 xl:block", optionsClassName)}>
          {colorVariations}
          {serviceCardsAt === "options" ? <ProductServiceCards /> : null}
        </div>
      ) : null}

      <B2BApplyDialog open={b2bOpen} onClose={() => setB2bOpen(false)} />
    </>
  );
}
