import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { StorefrontHomeBanner } from "@/lib/design/home-banners";
import { cn } from "@/lib/cn";

function PromoBanner({
  banner,
  className,
  sizes,
  priority = false,
}: {
  banner: StorefrontHomeBanner;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  const wide = banner.slot === "flash-wide";

  return (
    <Link
      href={banner.href}
      className={cn(
        "group relative block overflow-hidden rounded-sm border border-border bg-text transition-[border-color,box-shadow] duration-300 hover:border-text/40 hover:shadow-[0_10px_30px_-18px_rgb(14_26_36/0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <Image
        src={banner.image}
        alt={banner.imageAlt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
      />
      {/*
        The scrim used to sit at `via-text/80` across the whole middle, which
        held the photo under near-solid ink for most of its width — the image
        read as a smear rather than a product. From `sm` up it now goes opaque
        only under the copy and clears by the right edge, so the photograph is
        actually visible while the text keeps a solid backing.

        Below `sm` it stays heavy the whole way across: the title wraps to two
        lines there and runs most of the width, so the clearing gradient left
        white text sitting on a bright photo at roughly 2.9:1. At `text/70`
        the worst case (a pure white photo underneath) is about 6.4:1.
      */}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-text via-text/85 to-text/70 transition-opacity duration-500 group-hover:opacity-90 sm:from-10% sm:via-text/70 sm:via-55% sm:to-text/5"
      />

      <span
        className={cn(
          "relative flex h-full flex-col items-start justify-center",
          wide
            ? "gap-2.5 px-6 py-6 sm:px-10 lg:px-14"
            : "gap-2 px-5 py-5 sm:px-7 sm:py-6",
        )}
      >
        {/*
          Was `text-primary` on the ink scrim — 2.38:1 under the old teal,
          and no better under the new blue, so still under the
          4.5:1 AA floor and all but invisible. A light translucent chip puts
          it at full contrast and reads as a label rather than stray text.
        */}
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface/15 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-primary-foreground uppercase ring-1 ring-surface/20 backdrop-blur-sm">
          <span aria-hidden className="size-1.5 rounded-full bg-primary-bright" />
          {banner.eyebrow}
        </span>
        <span
          className={cn(
            "max-w-md font-semibold tracking-tight text-primary-foreground",
            wide ? "text-xl sm:text-2xl lg:text-3xl" : "text-lg sm:text-xl",
          )}
        >
          {banner.title}
        </span>
        {banner.text ? (
          <span className="hidden max-w-sm text-caption text-primary-foreground/70 sm:block">
            {banner.text}
          </span>
        ) : null}
        {/* A pill rather than bare text: these tiles are entirely clickable,
            but nothing in the old layout looked like a control. */}
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full bg-surface/10 font-semibold text-primary-foreground ring-1 ring-surface/25 backdrop-blur-sm transition-colors duration-300 group-hover:bg-surface group-hover:text-text group-hover:ring-surface",
            wide ? "mt-1.5 px-4 py-2 text-label" : "mt-0.5 px-3.5 py-1.5 text-caption",
          )}
        >
          {banner.cta}
          <ArrowRight
            aria-hidden
            strokeWidth={2}
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </span>
    </Link>
  );
}

/** Wide flash-deal strip (Design Studio: Banners & Sliders → Flash Deal). Real, admin-managed. */
export function HomeFlashBanner({ banner }: { banner: StorefrontHomeBanner | null }) {
  if (!banner) {
    return null;
  }
  return (
    <section aria-label="Flash deal" className="scroll-mt-4">
      <PromoBanner
        banner={banner}
        className="aspect-[400/184] sm:aspect-[1370/242]"
        sizes="(min-width: 1280px) 1200px, 100vw"
      />
    </section>
  );
}

/** Paired promotional strips (Design Studio: Banners & Sliders → Deals & category). Real, admin-managed. */
export function HomePromoBanners({ banners }: { banners: StorefrontHomeBanner[] }) {
  if (banners.length === 0) {
    return null;
  }
  return (
    <section aria-label="Promotions" className="scroll-mt-4">
      <ul className="grid gap-4 sm:grid-cols-2">
        {banners.map((banner) => (
          // `min-w-0`: a grid item defaults to `min-width: auto`, so the
          // column refuses to shrink below the tile's min-content width and
          // the whole page picks up a horizontal scrollbar at tablet widths.
          <li key={banner.id} className="min-w-0">
            <PromoBanner
              banner={banner}
              // Height, not aspect ratio. A fixed ratio collapsed these to
              // ~94px between `sm` and `lg` — shorter than the chip + title
              // + pill stack — and pairing it with a `min-height` is worse
              // than useless here: `aspect-ratio` then resolves width *from*
              // that height (144px x 600/200 = 432px), pushing the tile wider
              // than its grid column and giving the whole page a horizontal
              // scrollbar. A min-height alone lets the tile grow when the
              // title wraps instead.
              className="min-h-36 sm:min-h-40 lg:min-h-44"
              sizes="(min-width: 640px) 50vw, 100vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
