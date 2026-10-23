import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OfferCountdown } from "@/features/marketing/offer-countdown";
import { listPublicPromotions } from "@/lib/marketing/promotions";
import type { PublicPromotion } from "@/lib/marketing/promotions";

export const metadata: Metadata = {
  title: "Offers — Techno House",
};

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
  const href = offerHref(promotion);

  const card = (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-[border-color,box-shadow,transform] duration-300 ease-out group-hover:border-primary/40 group-hover:shadow-[0_18px_40px_-28px_rgb(14_26_36/0.5)] motion-safe:group-hover:-translate-y-0.5">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-muted">
        {promotion.bannerSrc ? (
          <Image
            src={promotion.bannerSrc}
            alt={promotion.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
          />
        ) : (
          /* No artwork uploaded yet — a neutral placeholder, not an empty tile. */
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-soft to-surface-muted">
            <span className="text-3xl font-bold text-primary/50">
              {promotion.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="line-clamp-2 text-center text-label font-bold text-text">
          {promotion.name}
        </p>
        <OfferCountdown endsAtIso={promotion.endsAtIso} />
        <span
          className={buttonClassName({
            className: "mt-auto w-full",
          })}
        >
          View Details
        </span>
      </div>
    </div>
  );

  return (
    <li className="min-w-0">
      {href ? (
        <Link
          href={href}
          aria-label={`View details for ${promotion.name}`}
          className="group block h-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {card}
        </Link>
      ) : (
        <div className="group h-full">{card}</div>
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
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {promotions.map((promotion) => (
            <OfferCard key={promotion.id} promotion={promotion} />
          ))}
        </ul>
      )}
    </div>
  );
}
