import Image from "next/image";
import Link from "next/link";
import { HomeHeroSlider } from "@/features/home/home-hero-slider";
import { HomeServiceBar } from "@/features/home/home-service-bar";

function unsplash(photoPath: string) {
  return `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=900&h=700&q=80`;
}

const SIDE_PROMOS = [
  {
    href: "/shipping",
    title: "Order online",
    text: "Nationwide delivery options at checkout.",
    image: unsplash("photo-1566576912321-d58ddd7a6088"),
    imageAlt: "Packed parcels ready for delivery",
  },
  {
    href: "/category/pcs-servers",
    title: "Desktop PCs",
    text: "Specified towers for work and study.",
    image: unsplash("photo-1587202372634-32705e3bf49c"),
    imageAlt: "Desktop PC tower with RGB lighting",
  },
] as const;

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero" className="bg-background">
      <h1 id="home-hero" className="sr-only">
        Techno House
      </h1>
      <div className="mx-auto grid max-w-catalog gap-3 px-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HomeHeroSlider />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
          {SIDE_PROMOS.map((promo) => (
            <li key={promo.href} className="min-h-0">
              <Link
                href={promo.href}
                className="group relative flex min-h-36 overflow-hidden bg-surface-muted lg:h-full"
              >
                <Image
                  src={promo.image}
                  alt={promo.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-text/85 via-text/35 to-transparent"
                />
                <span className="relative z-10 mt-auto w-full p-4">
                  <span className="block text-label font-semibold text-primary-foreground">
                    {promo.title}
                  </span>
                  <span className="mt-1 block text-caption text-primary-foreground/80">
                    {promo.text}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <HomeServiceBar />
    </section>
  );
}
