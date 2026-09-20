import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { ProductCardHoverActions } from "@/features/catalog/product-card-hover-actions";
import { AdminLabelBadge } from "@/features/admin/labels/admin-label-badge";
import type { ProductSummary } from "@/lib/data";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

/**
 * The cash a discount is actually worth on this product.
 *
 * The corner ribbon already shows the percentage, but a percentage needs
 * mental arithmetic against a price the shopper has to find first. The taka
 * figure is the thing they are deciding on, so it gets said outright.
 *
 * Derived from the same two numbers the card already prints, so it can never
 * disagree with them.
 */
function savingsAmount(product: ProductSummary): number | null {
  if (!product.compareAtPrice) {
    return null;
  }
  const saved = product.compareAtPrice.amount - product.price.amount;
  return saved > 0 ? saved : null;
}

function discountPercent(product: ProductSummary): number | null {
  if (!product.compareAtPrice || product.compareAtPrice.amount <= product.price.amount) {
    return null;
  }
  return Math.round(
    (1 - product.price.amount / product.compareAtPrice.amount) * 100,
  );
}

/** True when the card should call the product new, however that was decided. */
function isNewBadgeWorthy(product: ProductSummary): boolean {
  return product.isNewArrival || product.isNew;
}

function productLabel(
  product: ProductSummary,
): { text: string; tone: "new" | "sale" } | null {
  if (isNewBadgeWorthy(product)) {
    return { text: "New", tone: "new" };
  }
  if (product.isSale) {
    return { text: "Sale", tone: "sale" };
  }
  return null;
}

/**
 * Diagonal ribbon across the top-left corner when the product is in a
 * currently-running Promotion campaign — a bigger merchandising signal than
 * a generic discount/New/Sale flag, so it takes that corner over instead of
 * stacking on top of it. Needs `overflow-hidden` on the positioned ancestor
 * to clip the strip to the card at both edges.
 */
function OfferRibbon() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-3.5 -left-10 z-[3] w-36 -rotate-45 bg-gradient-to-r from-[#e0217a] to-[#c2185b] py-1 text-center text-[0.65rem] leading-none font-extrabold tracking-wide text-white uppercase shadow-sm"
    >
      Offer
    </div>
  );
}

/**
 * Corner wedge in the top-left of the image. Discount wins the slot; a
 * New/Sale flag only fills it when there is no percentage to show.
 */
function CornerFlag({
  product,
  off,
}: {
  product: ProductSummary;
  off: number | null;
}) {
  if (off != null) {
    return (
      <span className="pointer-events-none absolute top-0 left-0 z-[2] inline-flex items-center justify-center rounded-br-[1.5rem] bg-gradient-to-br from-[#b8862b] via-[#d4a94a] to-[#eed99b] px-3 py-1.5 text-[0.7rem] leading-none font-extrabold tabular-nums text-[#3f2d07] shadow-sm">
        {off}%
      </span>
    );
  }
  const label = productLabel(product);
  if (!label) {
    return null;
  }
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-[2] inline-flex items-center justify-center rounded-br-[1.5rem] px-3 py-1.5 text-[0.65rem] leading-none font-extrabold tracking-wide text-white uppercase shadow-sm",
        label.tone === "new"
          ? "bg-gradient-to-br from-primary to-primary/75"
          : "bg-gradient-to-br from-secondary to-secondary/75",
      )}
    >
      {label.text}
    </span>
  );
}

/** Homepage, wishlist, and catalog grid card. */
export function ProductCard({ product }: { product: ProductSummary }) {
  const off = discountPercent(product);
  const saved = savingsAmount(product);
  const href = `/product/${product.slug}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-surface shadow-sm transition-[box-shadow,border-color] duration-300 ease-out hover:border-primary/30 hover:shadow-xl">
      {/*
        4:3, not square. Product photography is landscape far more often
        than not, and `object-contain` in a square box letterboxed a 3:2
        shot by ~54px top and bottom — that empty band, not the spacing
        below, was most of the dead air in the card.
      */}
      <div className="relative overflow-hidden border-b border-border/60 bg-surface">
        <Link href={href} className="block">
          <div className="relative aspect-[4/3]">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-contain p-2.5 transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.06] sm:p-3"
            />
          </div>
        </Link>

        {product.hasActiveOffer ? (
          <OfferRibbon />
        ) : (
          <>
            <CornerFlag product={product} off={off} />

            {/*
              The corner wedge holds the discount when there is one, so a
              product that is both new and discounted used to lose its NEW
              mark entirely — exactly the case a new-arrivals listing needs
              to show. It gets its own pill directly under the ribbon
              instead.
            */}
            {off != null && isNewBadgeWorthy(product) ? (
              <span className="pointer-events-none absolute top-9 left-2 z-[2] inline-flex items-center rounded-sm bg-primary px-1.5 py-0.5 text-[0.6rem] leading-none font-extrabold tracking-wide text-primary-foreground uppercase shadow-sm">
                New
              </span>
            ) : null}
          </>
        )}

        {product.labels.length > 0 ? (
          <ul
            className="pointer-events-none absolute top-2.5 right-2.5 z-[1] flex max-w-[60%] flex-col items-end gap-1"
            aria-label="Product labels"
          >
            {product.labels.slice(0, 3).map((item) => (
              <li key={item.id}>
                <AdminLabelBadge
                  text={item.text}
                  backgroundColor={item.backgroundColor}
                  textTone={item.textTone}
                  className="px-2 py-0.5 text-[10px] leading-tight shadow-sm"
                />
              </li>
            ))}
          </ul>
        ) : null}

        <ProductCardHoverActions
          slug={product.slug}
          href={href}
          name={product.name}
          categorySlug={product.categorySlug}
        />
      </div>

      <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5 sm:px-4 sm:pb-4">
        <Link href={href}>
          {/*
            Two lines are reserved so prices line up across a grid row.
            `min-h` is expressed in `em` so it tracks the line height
            exactly — `min-h-10` was 40px against 2x19.25px of text and
            left a few stray pixels under every one-line title.
          */}
          <h3 className="line-clamp-2 min-h-[2.6em] text-label leading-[1.3] font-bold tracking-tight text-text transition-colors group-hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[1.0625rem] font-bold tabular-nums tracking-tight text-text">
            {formatMoney(product.price)}
          </span>
          {product.compareAtPrice ? (
            <span className="text-caption tabular-nums text-text-muted line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          ) : null}
        </p>

        {/*
          Reserved even when there is no discount, for the same reason the
          warranty line below is: a conditional row would make every
          discounted card taller than its neighbours and leave `mt-auto` to
          pool the difference above the buttons on whichever card is
          shortest — the ragged-grid problem this card already fixed once.
        */}
        <p className="mt-1 min-h-[1.05rem] text-[0.7rem] leading-tight font-semibold text-success">
          {saved != null
            ? `Save Extra ${formatMoney({ amount: saved })} on various offer`
            : null}
        </p>

        {/*
          Kept in the layout even with nothing to say. Between this and the
          two-line title slot every card in a grid row is the same height,
          so `mt-auto` below has no slack left to pool into one wide gap on
          whichever card happens to be shortest.
        */}
        <p className="mt-1 flex min-h-[1.0625rem] items-center gap-1 text-[11px] leading-tight text-text-muted">
          {product.warrantyLabel ? (
            <>
              <ShieldCheck
                className="size-3.5 shrink-0 text-danger"
                aria-hidden
              />
              <span className="truncate">{product.warrantyLabel}</span>
            </>
          ) : null}
        </p>

        {/* 1:2 split — "Add to cart" is the long label and must not wrap. */}
        <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3">
          <Link
            href={href}
            className={buttonClassName({
              variant: "ink",
              size: "sm",
              className:
                "w-full rounded-sm px-1.5 text-[0.63rem] font-bold tracking-[0.05em] whitespace-nowrap uppercase duration-200",
            })}
          >
            View
          </Link>
          <AddToCartButton
            slug={product.slug}
            stockStatus={product.stockStatus}
            size="sm"
            variant="ghost"
            showHint={false}
            className="col-span-2 w-full rounded-sm border border-secondary/40 bg-secondary/20 px-1.5 text-[0.63rem] font-bold tracking-[0.05em] whitespace-nowrap text-text uppercase duration-200 hover:border-secondary/60 hover:bg-secondary/25"
          />
        </div>
      </div>
    </article>
  );
}

/** Category / shop listing card (demo IA — not a visual clone). */
export function CatalogProductCard({ product }: { product: ProductSummary }) {
  const specs = product.specs.slice(0, 5);
  const off = discountPercent(product);
  const saved = savingsAmount(product);
  const href = `/product/${product.slug}`;

  return (
    // `group` drives the hover actions below. Without it they would never
    // appear, since their reveal is `group-hover` on this element.
    <article className="group flex h-full flex-col border border-border bg-surface p-3 transition-[box-shadow,border-color] duration-300 ease-out hover:border-primary/40 hover:shadow-xl">
      {/*
        The image sits in its own positioned wrapper rather than inside the
        link. The corner flag, badges and hover buttons are absolutely
        positioned against it, and the hover buttons are real <button>s —
        nesting those inside an <a> is invalid markup and would navigate to
        the product on every wishlist click.
      */}
      <div className="relative overflow-hidden bg-surface-muted">
        <Link href={href} className="block">
          <div className="relative aspect-square">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              fill
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
              className="object-contain p-3 transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.06]"
            />
          </div>
        </Link>

        {product.hasActiveOffer ? (
          <OfferRibbon />
        ) : (
          <>
            <CornerFlag product={product} off={off} />

            {/*
              The corner wedge holds the discount when there is one, so a
              product that is both new and discounted would otherwise lose
              its NEW mark. Same treatment as the compact card.
            */}
            {off != null && isNewBadgeWorthy(product) ? (
              <span className="pointer-events-none absolute top-9 left-2 z-[2] inline-flex items-center rounded-sm bg-primary px-1.5 py-0.5 text-[0.6rem] leading-none font-extrabold tracking-wide text-primary-foreground uppercase shadow-sm">
                New
              </span>
            ) : null}
          </>
        )}

        {product.labels.length > 0 ? (
          <ul
            className="pointer-events-none absolute top-2 right-2 z-[1] flex max-w-[55%] flex-col items-end gap-1"
            aria-label="Product labels"
          >
            {product.labels.slice(0, 3).map((item) => (
              <li key={item.id}>
                <AdminLabelBadge
                  text={item.text}
                  backgroundColor={item.backgroundColor}
                  textTone={item.textTone}
                  className="px-2 py-0.5 text-[10px] shadow-sm"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Wishlist / compare / view, revealed on hover — they were three
            stacked buttons taking a third of the card's height. */}
        <ProductCardHoverActions
          slug={product.slug}
          href={href}
          name={product.name}
          categorySlug={product.categorySlug}
        />
      </div>

      <Link href={href}>
        <h3 className="mt-3 line-clamp-2 min-h-10 text-label font-semibold tracking-tight text-text">
          {product.name}
        </h3>
      </Link>

      <p className="mt-1 text-caption tabular-nums text-text-muted">
        {product.sku}
      </p>

      {specs.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-caption text-text-muted">
          {specs.map((spec) => (
            <li key={`${spec.label}-${spec.value}`} className="flex gap-1.5">
              <span aria-hidden className="text-text-muted">
                •
              </span>
              <span>
                <span className="text-text/80">{spec.label}</span>
                {" - "}
                {spec.value}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-4 text-center">
        <p className="text-body font-semibold tabular-nums text-text">
          {formatMoney(product.price)}
        </p>
        {product.compareAtPrice ? (
          <p className="mt-0.5 text-caption tabular-nums text-text-muted line-through">
            {formatMoney(product.compareAtPrice)}
          </p>
        ) : null}
        {/*
          Savings and warranty are separate rows now, not an either/or. A
          discounted product used to LOSE its warranty line to the savings
          line, which is the one product where both matter most.

          Both rows keep their height when empty: a conditional row would make
          discounted cards taller than their neighbours and leave `mt-auto`
          above to pool the difference into one ragged gap on whichever card
          in the row is shortest.
        */}
        <p className="mt-2 min-h-[1.05rem] text-caption leading-tight font-semibold text-success">
          {saved != null
            ? `Save Extra ${formatMoney({ amount: saved })} on various offer`
            : null}
        </p>
        <p className="mt-1 flex min-h-[1.25rem] items-center justify-center gap-1.5 text-caption text-text-muted">
          {product.warrantyBadge ? (
            <span
              aria-hidden
              className="inline-flex size-5 items-center justify-center rounded-full border border-amber-500 bg-neutral-900 text-[0.55rem] font-bold text-amber-400"
            >
              {product.warrantyBadge}
            </span>
          ) : null}
          {product.warrantyLabel}
        </p>
      </div>

      {/* Add to cart only. Wishlist, compare and view moved to the hover
          icons over the image — as three stacked buttons they cost roughly a
          third of the card's height on every product in the grid. */}
      <div className="mt-3 border-t border-border pt-3">
        <AddToCartButton
          slug={product.slug}
          stockStatus={product.stockStatus}
          size="sm"
        />
      </div>
    </article>
  );
}
