import Image from "next/image";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { brandRepository } from "@/lib/data";

/** Logos shown on the homepage; the rest are on /brands. */
const HOME_BRAND_LIMIT = 8;

export async function HomeBrands() {
  const brands = await brandRepository.list();
  const shown = brands.slice(0, HOME_BRAND_LIMIT);

  return (
    <section aria-labelledby="home-brands" className="scroll-mt-4">
      <div className="flex items-stretch">
        <h2
          id="home-brands"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          Brands
        </h2>
        <div className="flex min-w-0 flex-1 items-end justify-end border-b-2 border-text pb-1.5">
          <Link
            href="/brands"
            className="text-caption font-medium text-primary underline-offset-2 hover:underline"
          >
            See more
          </Link>
        </div>
      </div>

      {brands.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No brands yet"
          description="Brand shortcuts will appear here when the catalog is available."
        />
      ) : (
        <>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {shown.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brand/${brand.slug}`}
                  className="flex h-24 items-center justify-center border border-border bg-surface px-4 transition-colors hover:border-primary"
                >
                  <Image
                    src={brand.logoSrc}
                    alt={brand.name}
                    width={160}
                    height={48}
                    unoptimized
                    className="h-10 w-auto max-w-full object-contain object-center"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 flex justify-center">
            <Link
              href="/brands"
              className={buttonClassName({
                variant: "ghost",
                className:
                  "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
              })}
            >
              Explore all brands
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
