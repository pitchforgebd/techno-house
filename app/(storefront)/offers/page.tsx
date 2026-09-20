import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { listPublicPromotions } from "@/lib/marketing/promotions";
import type { PublicPromotion } from "@/lib/marketing/promotions";

export const metadata: Metadata = {
  title: "Offers — Techno House",
};

function scheduleLabel(
  startsAt: string | null,
  endsAt: string | null,
): string | null {
  if (startsAt && endsAt) {
    return `${startsAt} → ${endsAt}`;
  }
  if (startsAt) {
    return `From ${startsAt}`;
  }
  if (endsAt) {
    return `Until ${endsAt}`;
  }
  return null;
}

/**
 * Rotated strip down the banner's left edge. `bannerLabel` is the admin's
 * word for it; the channel is a readable fallback so the strip is never
 * blank on a campaign nobody has labelled yet.
 */
function stripLabel(promotion: PublicPromotion): string {
  return (promotion.bannerLabel || promotion.channel).toUpperCase();
}

/**
 * Once a campaign has products assigned, its own offer page is the
 * authoritative destination — a hand-typed `bannerHref` only matters for a
 * product-less announcement banner (e.g. a cashback promo with nothing to
 * list).
 */
function offerHref(promotion: PublicPromotion): string | null {
  if (promotion.hasProducts) {
    return `/offers/${promotion.slug}`;
  }
  return promotion.bannerHref;
}

function OfferCard({ promotion }: { promotion: PublicPromotion }) {
  const schedule = scheduleLabel(promotion.startsAt, promotion.endsAt);
  const label = stripLabel(promotion);
  const href = offerHref(promotion);

  const inner = (
    <div className="flex h-full min-h-36 overflow-hidden rounded-sm border border-border bg-surface transition-[border-color,box-shadow,transform] duration-300 ease-out group-hover:border-primary/40 group-hover:shadow-[0_18px_40px_-28px_rgb(14_26_36/0.5)] motion-safe:group-hover:-translate-y-0.5 sm:min-h-44">
      {/*
        Vertical category strip, reading bottom-to-top like the reference.
        `writing-mode` keeps it a real text node — an image of the word would
        be invisible to search and screen readers.
      */}
      <span
        className="flex shrink-0 items-center justify-center bg-text px-2 py-4 text-[0.6rem] font-bold tracking-[0.18em] text-surface uppercase sm:text-[0.68rem]"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        {label}
      </span>

      <div className="relative min-w-0 flex-1 bg-surface-muted">
        {promotion.bannerSrc ? (
          <Image
            src={promotion.bannerSrc}
            alt={promotion.name}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          /*
            No artwork uploaded yet. Rather than an empty tile, fall back to
            the campaign's own words so the page still says something true.
          */
          <div className="flex h-full flex-col justify-center gap-1.5 px-5 py-5 sm:px-7">
            <p className="text-lg font-semibold tracking-tight text-text sm:text-xl">
              {promotion.name}
            </p>
            {promotion.summary ? (
              <p className="max-w-prose text-label leading-relaxed text-text-muted">
                {promotion.summary}
              </p>
            ) : null}
            {schedule ? (
              <p className="text-caption tabular-nums text-text-muted">
                {schedule}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <li className="min-w-0">
      {href ? (
        <Link
          href={href}
          aria-label={promotion.name}
          className="group block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {inner}
        </Link>
      ) : (
        <div className="group">{inner}</div>
      )}
    </li>
  );
}

export default async function OffersPage() {
  const promotions = await listPublicPromotions();

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Latest offers
        </h1>
        <p className="mt-2 text-label text-text-muted">
          Running campaigns. Prices and discounts are recalculated at checkout.
        </p>
      </div>

      {promotions.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Current offers"
          description="Promotions will appear here when a campaign is active."
        />
      ) : (
        <ul className="mt-8 grid gap-4 lg:grid-cols-2">
          {promotions.map((promotion) => (
            <OfferCard key={promotion.id} promotion={promotion} />
          ))}
        </ul>
      )}
    </div>
  );
}
