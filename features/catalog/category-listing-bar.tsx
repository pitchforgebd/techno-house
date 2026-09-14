import { CatalogSortControl } from "@/features/catalog/catalog-sort-control";
import type { ParsedListingQuery } from "@/lib/catalog/listing-params";

export function CategoryListingBar({
  title,
  total,
  pathname,
  parsed,
}: {
  title: string;
  total: number;
  pathname: string;
  parsed: ParsedListingQuery;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 border border-border bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-5 sm:py-4">
      <h1 className="min-w-0 text-balance text-[1.05rem] font-semibold leading-snug tracking-tight text-text sm:text-lg">
        {title}
        <span className="ml-2 font-normal text-text-muted">
          ({total} {total === 1 ? "Product" : "Products"} found)
        </span>
      </h1>

      <div className="flex shrink-0 items-center gap-3 border-t border-border pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
        <span className="whitespace-nowrap text-caption font-medium text-text-muted">
          Sort By
        </span>
        <CatalogSortControl
          pathname={pathname}
          parsed={parsed}
          preserved={{}}
          includeBrand
          hideLabel
          className="min-h-9 min-w-[11.5rem] border-border bg-background py-1.5 text-label"
        />
      </div>
    </div>
  );
}
