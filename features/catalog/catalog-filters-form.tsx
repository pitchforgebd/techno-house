import Link from "next/link";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND_FACET_KEY } from "@/lib/catalog/listing-params";
import type { Brand, Facet } from "@/lib/data";
import type { ParsedListingFilters } from "@/lib/catalog/listing-params";
import { cn } from "@/lib/cn";

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

  return (
    <form
      method="get"
      action={pathname}
      className={cn("flex flex-col", compact ? "gap-5" : "gap-6")}
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
            defaultChecked={parsed.inStockOnly}
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
              const selected =
                facet.key === BRAND_FACET_KEY
                  ? parsed.brandSlugs.includes(entry.value)
                  : (parsed.filters[facet.key] ?? []).includes(entry.value);
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
                      defaultChecked={selected}
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

      <div className={cn("flex flex-wrap gap-2", compact && "pt-1")}>
        <Button type="submit" size="sm" className={cn(compact && "w-full")}>
          {compact ? "Submit" : "Apply filters"}
        </Button>
        {hideReset ? null : (
          <Link
            href={resetHref}
            className={buttonClassName({ variant: "ghost", size: "sm" })}
          >
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
