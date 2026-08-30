"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { Select } from "@/components/ui/select";
import {
  PRODUCT_SORT_LABELS,
  PRODUCT_SORTS,
  type ParsedListingQuery,
  listingHref,
} from "@/lib/catalog/listing-params";
import type { ProductSort } from "@/lib/data";

export function CatalogSortControl({
  pathname,
  parsed,
  preserved,
  includeBrand,
  hideLabel = false,
  className,
}: {
  pathname: string;
  parsed: ParsedListingQuery;
  preserved: { q?: string };
  includeBrand: boolean;
  hideLabel?: boolean;
  className?: string;
}) {
  const router = useRouter();

  function onChange(event: FormEvent<HTMLSelectElement>) {
    const sort = event.currentTarget.value as ProductSort;
    router.push(
      listingHref(pathname, parsed, {
        q: preserved.q,
        includeBrand,
        sort,
        omitPage: true,
      }),
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hideLabel ? null : (
        <label htmlFor="catalog-sort" className="text-caption text-text-muted">
          Sort
        </label>
      )}
      <Select
        id="catalog-sort"
        name="sort"
        defaultValue={parsed.sort}
        onChange={onChange}
        className={
          className ?? "min-h-9 w-auto min-w-[12rem] py-1.5 text-label"
        }
        aria-label="Sort products"
      >
        {PRODUCT_SORTS.map((value) => (
          <option key={value} value={value}>
            {PRODUCT_SORT_LABELS[value]}
          </option>
        ))}
      </Select>
    </div>
  );
}
