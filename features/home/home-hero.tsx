import Image from "next/image";
import Link from "next/link";
import { HomeHeroSlider } from "@/features/home/home-hero-slider";
import { HomeServiceBar } from "@/features/home/home-service-bar";
import type { StorefrontHomeBanner } from "@/lib/design/home-banners";
import { cn } from "@/lib/cn";

const SIDE_IMAGE_LIMIT = 2;

export function HomeHero({
  banners,
  sideBanners,
}: {
  banners: StorefrontHomeBanner[];
  sideBanners: StorefrontHomeBanner[];
}) {
  const hasHero = banners.length > 0;
  const sideImages = sideBanners.slice(0, SIDE_IMAGE_LIMIT);
  const hasSideImages = sideImages.length > 0;

  return (
    <section aria-labelledby="home-hero" className="bg-background">
      <h1 id="home-hero" className="sr-only">
        Techno House
      </h1>
      <div
        className={cn(
          "mx-auto grid max-w-catalog gap-3 px-4 py-4",
          hasHero && hasSideImages && "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
        )}
      >
        {hasHero ? <HomeHeroSlider banners={banners} /> : null}
        {hasSideImages ? (
          <ul
            className={cn(
              "grid gap-3 sm:grid-cols-2",
              hasHero && "lg:grid-cols-1 lg:grid-rows-2",
            )}
          >
            {sideImages.map((promo) => (
              <li key={promo.id} className="min-h-0">
                <Link
                  href={promo.href}
                  aria-label={promo.title}
                  className="group relative flex min-h-44 overflow-hidden rounded-sm bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-bright sm:min-h-48 lg:h-full lg:min-h-0"
                >
                  {/* Artwork only — no scrim, no overlaid label. The name
                      lives in `aria-label` so the link is still announced. */}
                  <Image
                    src={promo.image}
                    alt={promo.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <HomeServiceBar />
    </section>
  );
}
