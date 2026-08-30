import Link from "next/link";
import { listingHref } from "@/lib/catalog/listing-params";
import type { ParsedListingQuery } from "@/lib/catalog/listing-params";
import { cn } from "@/lib/cn";

export type CategoryBrandPill = {
  slug: string;
  name: string;
  count: number;
};

export function CategoryBrandPills({
  pathname,
  parsed,
  brands,
}: {
  pathname: string;
  parsed: ParsedListingQuery;
  brands: CategoryBrandPill[];
}) {
  if (brands.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Filter by brand" className="mt-5">
      <ul className="flex flex-wrap gap-2">
        {brands.map((brand) => {
          const active = parsed.brandSlugs.includes(brand.slug);
          const nextBrands = active
            ? parsed.brandSlugs.filter((slug) => slug !== brand.slug)
            : [brand.slug];
          const href = listingHref(
            pathname,
            { ...parsed, brandSlugs: nextBrands, page: 1 },
            { includeBrand: true, omitPage: true },
          );

          return (
            <li key={brand.slug}>
              <Link
                href={href}
                aria-pressed={active}
                title={`${brand.name} (${brand.count})`}
                className={cn(
                  "inline-flex h-9 items-center border bg-surface px-4 text-[0.8125rem] font-medium tracking-tight transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-text hover:border-primary/50 hover:text-primary",
                )}
              >
                {brand.name}
              </Link>
            </li>
          );
        })}
        {parsed.brandSlugs.length > 0 ? (
          <li className="flex items-center">
            <Link
              href={listingHref(
                pathname,
                { ...parsed, brandSlugs: [], page: 1 },
                { includeBrand: true, omitPage: true },
              )}
              className="px-2 text-[0.8125rem] font-medium text-text-muted underline-offset-2 hover:text-primary hover:underline"
            >
              Clear
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
