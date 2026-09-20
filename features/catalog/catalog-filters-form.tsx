"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useTransition } from "react";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND_FACET_KEY } from "@/lib/catalog/listing-params";
import type { Brand, Facet } from "@/lib/data";
import type { ParsedListingFilters } from "@/lib/catalog/listing-params";
import { cn } from "@/lib/cn";

/** Typing in a price box shouldn't fire a request per keystroke. */
const PRICE_DEBOUNCE_MS = 500;

const FACET_LABELS: Record<string, string> = {
  [BRAND_FACET_KEY]: "Brand",
  processor: "Processor",
  ram: "RAM",
  storage: "Storage",
  graphics: "Graphics",
  socket: "Socket",
  cores: "Cores",
  coolerType: "Cooler type",
  formFactor: "Form factor",
  ramType: "RAM type",
  capacity: "Capacity",
  memory: "Memory",
  wattage: "Wattage",
  size: "Size",
  panel: "Panel",
};

function facetLabel(key: string): string {
  return (
    FACET_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())
  );
}

/** The query string the current URL state would produce, in the same shape
 * the form itself submits — so an in-flight optimistic value and the value
 * that arrives back from the server are directly comparable. */
function paramsFromParsed(
  parsed: ParsedListingFilters,
  facets: Facet[],
  preserved: { q?: string },
  sort?: string,
): string {
  const params = new URLSearchParams();
  if (preserved.q) {
    params.set("q", preserved.q);
  }
  if (sort && sort !== "featured") {
    params.set("sort", sort);
  }
  if (parsed.inStockOnly) {
    params.set("stock", "1");
  }
  if (parsed.minPrice != null) {
    params.set("minPrice", String(parsed.minPrice));
  }
  if (parsed.maxPrice != null) {
    params.set("maxPrice", String(parsed.maxPrice));
  }
  for (const facet of facets) {
    const values =
      facet.key === BRAND_FACET_KEY
        ? parsed.brandSlugs
        : (parsed.filters[facet.key] ?? []);
    for (const value of values) {
      params.append(facet.key, value);
    }
  }
  return params.toString();
}

function paramsFromForm(form: HTMLFormElement): string {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === "string" && value.trim() !== "") {
      params.append(key, value);
    }
  }
  return params.toString();
}

export function CatalogFiltersForm({
  pathname,
  preserved,
  parsed,
  facets,
  brands,
  resetHref,
  sort,
  idPrefix = "filter",
  hideReset = false,
  compact = false,
}: {
  pathname: string;
  preserved: { q?: string };
  parsed: ParsedListingFilters;
  facets: Facet[];
  brands: Brand[];
  resetHref: string;
  /** Preserve current sort when applying filters (resets page). */
  sort?: string;
  idPrefix?: string;
  hideReset?: boolean;
  compact?: boolean;
}) {
  const brandNames = new Map(brands.map((brand) => [brand.slug, brand.name]));
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const priceTimer = useRef<number | null>(null);

  const serverParams = paramsFromParsed(parsed, facets, preserved, sort);
  // Ticks the box immediately instead of waiting for the server round-trip,
  // and is dropped automatically once the new URL's state arrives — so the
  // browser's back button stays correct too.
  const [activeParams, setActiveParams] = useOptimistic(serverParams);
  const active = new URLSearchParams(activeParams);

  useEffect(
    () => () => {
      if (priceTimer.current !== null) {
        window.clearTimeout(priceTimer.current);
      }
    },
    [],
  );

  /** No `page` is ever carried over: changing a filter goes back to page 1,
   * exactly as the old submit button did. */
  function apply(form: HTMLFormElement) {
    const next = paramsFromForm(form);
    startTransition(() => {
      setActiveParams(next);
      router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }

  function applyNow(form: HTMLFormElement | null) {
    if (!form) {
      return;
    }
    if (priceTimer.current !== null) {
      window.clearTimeout(priceTimer.current);
      priceTimer.current = null;
    }
    apply(form);
  }

  function applyDebounced(form: HTMLFormElement | null) {
    if (!form) {
      return;
    }
    if (priceTimer.current !== null) {
      window.clearTimeout(priceTimer.current);
    }
    priceTimer.current = window.setTimeout(() => {
      priceTimer.current = null;
      apply(form);
    }, PRICE_DEBOUNCE_MS);
  }

  return (
    <form
      // Kept as a real GET form so it still submits natively if the click
      // handler never runs; filtering itself no longer needs a button.
      method="get"
      action={pathname}
      aria-busy={isPending}
      className={cn(
        "flex flex-col transition-opacity",
        compact ? "gap-5" : "gap-6",
        isPending && "opacity-60",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        applyNow(event.currentTarget);
      }}
    >
      {preserved.q ? (
        <input type="hidden" name="q" value={preserved.q} />
      ) : null}
      {sort && sort !== "featured" ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}

      <fieldset>
        <legend className="text-caption font-semibold uppercase tracking-[0.04em] text-text">
          Stock
        </legend>
        <label className="mt-2.5 inline-flex items-center gap-2 text-label text-text">
          <input
            id={`${idPrefix}-stock`}
            type="checkbox"
            name="stock"
            value="1"
            checked={active.get("stock") === "1"}
            onChange={(event) => applyNow(event.currentTarget.form)}
            className="size-3.5 rounded-sm border-border accent-primary"
          />
          In stock only
        </label>
      </fieldset>

      <fieldset>
        <legend className="text-caption font-semibold uppercase tracking-[0.04em] text-text">
          Price (৳)
        </legend>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor={`${idPrefix}-minPrice`}
              className="text-caption text-text-muted"
            >
              Min
            </label>
            <Input
              id={`${idPrefix}-minPrice`}
              name="minPrice"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={parsed.minPrice ?? ""}
              onChange={(event) => applyDebounced(event.currentTarget.form)}
              className="mt-1 h-9 text-label"
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-maxPrice`}
              className="text-caption text-text-muted"
            >
              Max
            </label>
            <Input
              id={`${idPrefix}-maxPrice`}
              name="maxPrice"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={parsed.maxPrice ?? ""}
              onChange={(event) => applyDebounced(event.currentTarget.form)}
              className="mt-1 h-9 text-label"
            />
          </div>
        </div>
      </fieldset>

      {facets.map((facet) => (
        <fieldset key={facet.key}>
          <legend className="text-caption font-semibold uppercase tracking-[0.04em] text-text">
            {facetLabel(facet.key)}
          </legend>
          <ul className="mt-2.5 space-y-2">
            {facet.values.map((entry) => {
              const label =
                facet.key === BRAND_FACET_KEY
                  ? (brandNames.get(entry.value) ?? entry.value)
                  : entry.value;
              return (
                <li key={`${facet.key}-${entry.value}`}>
                  <label className="inline-flex items-start gap-2 text-label text-text">
                    <input
                      type="checkbox"
                      name={facet.key}
                      value={entry.value}
                      checked={active.getAll(facet.key).includes(entry.value)}
                      onChange={(event) => applyNow(event.currentTarget.form)}
                      className="mt-0.5 size-3.5 shrink-0 rounded-sm border-border accent-primary"
                    />
                    <span>
                      {label}{" "}
                      <span className="text-caption text-text-muted">
                        ({entry.count})
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      {hideReset ? null : (
        <div className={cn("flex flex-wrap gap-2", compact && "pt-1")}>
          <Link
            href={resetHref}
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: cn("border border-border", compact && "w-full"),
            })}
          >
            Reset filters
          </Link>
        </div>
      )}
    </form>
  );
}
