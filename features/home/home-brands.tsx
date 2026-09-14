import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { HomeSectionHeader } from "@/features/home/home-section-header";
import { brandRepository } from "@/lib/data";

/** Logos shown on the homepage; the last grid cell links to /brands. */
const HOME_BRAND_LIMIT = 9;

export async function HomeBrands() {
  const brands = await brandRepository.list();
  const shown = brands.slice(0, HOME_BRAND_LIMIT);

  return (
    <section aria-labelledby="home-brands" className="scroll-mt-4">
      <HomeSectionHeader
        id="home-brands"
        title="Brands"
        lede="Jump straight to everything listed under a name."
        actionHref="/brands"
        actionLabel="All brands"
      />

      {brands.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No brands yet"
          description="Brand shortcuts will appear here when the catalog is available."
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-sm border border-border">
          <ul className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
            {shown.map((brand) => (
              <li key={brand.slug} className="bg-surface">
                <Link
                  href={`/brand/${brand.slug}`}
                  className="group flex h-24 items-center justify-center px-5 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:h-28"
                >
                  <Image
                    src={brand.logoSrc}
                    alt={brand.name}
                    width={160}
                    height={48}
                    unoptimized
                    className="h-9 w-auto max-w-full object-contain object-center transition duration-300 ease-out motion-safe:group-hover:scale-105"
                  />
                </Link>
              </li>
            ))}
            <li className="bg-surface">
              <Link
                href="/brands"
                className="group flex h-24 flex-col items-center justify-center gap-1 px-5 text-center transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:h-28"
              >
                <span className="text-label font-semibold tracking-tight text-text transition-colors group-hover:text-primary">
                  All brands
                </span>
                <span className="inline-flex items-center gap-1 text-caption text-text-muted">
                  {brands.length} listed
                  <ArrowRight
                    aria-hidden
                    strokeWidth={1.75}
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
