"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  loadCompatibilityParts,
  loadEnabledRuleTypes,
} from "@/features/pc-builder/actions";
import { BuilderSlotIcon } from "@/features/pc-builder/builder-slot-icons";
import {
  PcBuilderSelectCard,
  type PcBuilderCardCompatibility,
} from "@/features/pc-builder/pc-builder-select-card";
import { PcBuilderSelectSidebar } from "@/features/pc-builder/pc-builder-select-sidebar";
import { useBuilderStore } from "@/features/pc-builder/use-builder-store";
import type { BuilderCandidate } from "@/lib/data";
import {
  rankCandidatesForSlot,
  type BuilderSlotMeta,
} from "@/lib/domain/pc-builder";

type SelectSort = "default" | "price_asc" | "price_desc" | "discount";

const SORT_OPTIONS: { value: SelectSort; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price_asc", label: "Low to high (price)" },
  { value: "price_desc", label: "High to low (price)" },
  { value: "discount", label: "High to low (discount)" },
];

function sortProducts(
  products: BuilderCandidate[],
  sort: SelectSort,
): BuilderCandidate[] {
  const list = [...products];
  switch (sort) {
    case "price_asc":
      return list.sort((a, b) => a.price.amount - b.price.amount);
    case "price_desc":
      return list.sort((a, b) => b.price.amount - a.price.amount);
    case "discount":
      return list.sort((a, b) => {
        const discountA =
          a.compareAtPrice && a.isSale
            ? a.compareAtPrice.amount - a.price.amount
            : 0;
        const discountB =
          b.compareAtPrice && b.isSale
            ? b.compareAtPrice.amount - b.price.amount
            : 0;
        return discountB - discountA;
      });
    default:
      return list;
  }
}

export function PcBuilderSelectView({
  slot,
  products,
}: {
  slot: BuilderSlotMeta;
  products: BuilderCandidate[];
}) {
  const router = useRouter();
  const { selection, selectPart } = useBuilderStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SelectSort>("default");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [compatByslug, setCompatBySlug] = useState<
    Map<string, PcBuilderCardCompatibility>
  >(new Map());

  const selectedSlug =
    (selection[slot.id] as string | null | undefined) ?? null;

  // Real "suggest as you pick" (AD-276): score every candidate against
  // whatever's already selected elsewhere in the build, using the same
  // compatibility engine the review page and checkout already trust.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const [selectedParts, enabledTypes] = await Promise.all([
        loadCompatibilityParts(selection),
        loadEnabledRuleTypes(),
      ]);
      if (cancelled) return;
      const ranked = rankCandidatesForSlot({
        slot: slot.id,
        candidates: products,
        selectedParts,
        enabledTypes,
      });
      setCompatBySlug(
        new Map(
          ranked.map((entry) => [
            entry.candidate.slug,
            {
              status: entry.status,
              reason: entry.warnings[0]?.message,
            },
          ]),
        ),
      );
    }
    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, slot.id, JSON.stringify(selection)]);

  const filtered = useMemo(() => {
    let list = products;
    if (inStockOnly) {
      list = list.filter((product) => product.stockStatus !== "out_of_stock");
    }
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      list = list.filter((product) => {
        const haystack =
          `${product.name} ${product.brandName} ${product.sku}`.toLowerCase();
        return haystack.includes(trimmed);
      });
    }
    if (!showIncompatible) {
      list = list.filter(
        (product) => compatByslug.get(product.slug)?.status !== "incompatible",
      );
    }
    return sortProducts(list, sort);
  }, [products, query, sort, inStockOnly, showIncompatible, compatByslug]);

  const hiddenIncompatibleCount = useMemo(
    () =>
      products.filter(
        (product) => compatByslug.get(product.slug)?.status === "incompatible",
      ).length,
    [products, compatByslug],
  );

  function handleAdd(slotId: typeof slot.id, slug: string) {
    const product = products.find((item) => item.slug === slug);
    selectPart(slotId, slug);
    notifySuccess({
      title: `${slot.label} added`,
      description: product?.name ?? "Part added to your build.",
    });
    router.push("/pc-builder");
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/pc-builder", label: "PC Builder" },
          { label: `Select ${slot.label}` },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/pc-builder"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to PC Builder
        </Link>
      </div>

      <header className="mt-6 flex flex-wrap items-start gap-4 rounded-md border border-border bg-surface p-5">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <BuilderSlotIcon slotId={slot.id} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-medium uppercase tracking-wide text-primary">
            Select your components
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
            {slot.label}
            <span className="ml-2 text-body font-normal text-text-muted">
              ({filtered.length}{" "}
              {filtered.length === 1 ? "product" : "products"} found)
            </span>
          </h1>
          <p className="mt-2 max-w-prose text-body text-text-muted">
            {slot.description}. Choose a part and it will be added to your
            build.
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="relative min-w-0 flex-1 sm:min-w-[14rem]">
              <span className="sr-only">Search parts</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${slot.label.toLowerCase()}…`}
                className="min-h-10 w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-label text-text placeholder:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-caption text-text">
                <SlidersHorizontal
                  className="size-4 text-text-muted"
                  aria-hidden
                />
                <span className="text-text-muted">Sort</span>
                <Select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SelectSort)
                  }
                  aria-label="Sort products"
                  className="min-w-[11rem]"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-caption text-text">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(event) => setInStockOnly(event.target.checked)}
                  className="size-4 rounded border-border text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
                />
                In stock only
              </label>
            </div>
          </div>

          {hiddenIncompatibleCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-muted/60 px-4 py-2.5 text-caption text-text-muted">
              <span>
                {hiddenIncompatibleCount}{" "}
                {hiddenIncompatibleCount === 1 ? "part doesn't" : "parts don't"}{" "}
                match what you&apos;ve already picked
                {showIncompatible ? " (shown below, flagged red)." : "."}
              </span>
              <button
                type="button"
                onClick={() => setShowIncompatible((value) => !value)}
                className="font-medium text-primary hover:underline"
              >
                {showIncompatible ? "Hide them again" : "Show them anyway"}
              </button>
            </div>
          ) : null}

          {products.length === 0 ? (
            <EmptyState
              title="No parts for this slot"
              description="The catalog has no products mapped to this builder slot yet."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matches"
              description="Try a different search term or clear filters."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <li key={product.slug}>
                  <PcBuilderSelectCard
                    product={product}
                    slotId={slot.id}
                    selectedSlug={selectedSlug}
                    onAdd={handleAdd}
                    compatibility={compatByslug.get(product.slug)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <PcBuilderSelectSidebar selection={selection} activeSlot={slot} />
      </div>
    </div>
  );
}
