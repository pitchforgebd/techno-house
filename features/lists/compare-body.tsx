"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Printer, Share2, Trash2 } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { notifyError, notifyToast } from "@/components/ui/feedback-provider";
import {
  loadCompareCandidates,
  loadCompareCategories,
  loadListProducts,
  type CompareCandidate,
  type CompareCategoryOption,
} from "@/features/lists/actions";
import { useListsStore } from "@/features/lists/use-lists-store";
import { MAX_COMPARE } from "@/lib/catalog/lists";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";

const selectClass =
  "min-h-11 w-full rounded-md border border-border bg-surface px-3 text-label text-text focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted";

const cellClass = "border-b border-border px-4 py-3 align-top text-label";

export function CompareBody({ className }: { className?: string }) {
  const { state, removeCompare, clearCompare, toggleCompare, setCompare } =
    useListsStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();
  const [categories, setCategories] = useState<CompareCategoryOption[]>([]);
  // Kept with the category it was loaded for, so a stale list is never shown
  // for a newly picked type (and nothing has to be cleared in an effect).
  const [loaded, setLoaded] = useState<{
    category: string;
    items: CompareCandidate[];
  }>({ category: "", items: [] });
  const [pickedCategory, setPickedCategory] = useState("");
  const [adding, startAdding] = useTransition();

  const slugs = useMemo(
    () => state.compare.map((entry) => entry.slug),
    [state.compare],
  );
  const sharedItems = searchParams.get("items");

  // A shared link carries the slugs; adopt them once, then drop the param so
  // later removals aren't undone by a refresh.
  useEffect(() => {
    if (!sharedItems) {
      return;
    }
    const wanted = sharedItems
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean)
      .slice(0, MAX_COMPARE);
    if (wanted.length === 0) {
      return;
    }
    let cancelled = false;
    void loadListProducts(wanted).then((items) => {
      if (cancelled || items.length === 0) {
        return;
      }
      setCompare(
        items.map((item) => ({
          slug: item.slug,
          categorySlug: item.categorySlug,
        })),
      );
      router.replace("/compare");
    });
    return () => {
      cancelled = true;
    };
  }, [sharedItems, setCompare, router]);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const items = await loadListProducts(slugs);
      if (!cancelled) {
        setProducts(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  useEffect(() => {
    let cancelled = false;
    void loadCompareCategories().then((items) => {
      if (!cancelled) {
        setCategories(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(() => {
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((product): product is ProductSummary => Boolean(product));
  }, [products, slugs]);

  // Compare only accepts one category, so once something is picked the type is
  // fixed — the dropdown then just reports it rather than offering a choice.
  const lockedCategory = state.compare[0]?.categorySlug ?? null;
  const activeCategory = lockedCategory ?? pickedCategory;

  useEffect(() => {
    if (!activeCategory) {
      return;
    }
    let cancelled = false;
    void loadCompareCandidates(activeCategory).then((items) => {
      if (!cancelled) {
        setLoaded({ category: activeCategory, items });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const candidates =
    loaded.category === activeCategory && activeCategory ? loaded.items : [];

  const specLabels = useMemo(() => {
    const labels: string[] = [];
    for (const product of ordered) {
      for (const spec of product.specs) {
        if (!labels.includes(spec.label)) {
          labels.push(spec.label);
        }
      }
    }
    return labels;
  }, [ordered]);

  const handleAdd = useCallback(
    (slug: string) => {
      if (!slug) {
        return;
      }
      const candidateCategory = activeCategory;
      if (!candidateCategory) {
        return;
      }
      startAdding(async () => {
        const result = toggleCompare(slug, candidateCategory);
        if (!result.ok) {
          notifyError(result.reason);
          return;
        }
        notifyToast("Added to compare");
      });
    },
    [activeCategory, toggleCompare],
  );

  const handleShare = useCallback(async () => {
    if (ordered.length === 0) {
      return;
    }
    const url = `${window.location.origin}/compare?items=${ordered
      .map((product) => encodeURIComponent(product.slug))
      .join(",")}`;
    const shareData = {
      title: "Product comparison",
      text: ordered.map((product) => product.name).join(" vs "),
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Cancelled or unsupported — fall through to copying instead.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      notifyToast("Comparison link copied");
    } catch {
      notifyError("Could not copy the link. Copy it from the address bar.");
    }
  }, [ordered]);

  const remaining = MAX_COMPARE - ordered.length;
  const alreadyPicked = new Set(ordered.map((product) => product.slug));
  const selectable = candidates.filter(
    (item) => !alreadyPicked.has(item.slug),
  );

  if (state.compare.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          title="No products to compare"
          description={`Pick Compare on any product card to start. Products must share a category — up to ${MAX_COMPARE} at a time.`}
          action={
            <Link href="/shop" className={buttonClassName({ size: "sm" })}>
              Browse shop
            </Link>
          }
        />
      </div>
    );
  }

  if (pending && ordered.length === 0) {
    return (
      <p className={cn("text-body text-text-muted", className)}>
        Loading comparison…
      </p>
    );
  }

  if (ordered.length === 0) {
    return (
      <div className={cn(className)}>
        <EmptyState
          title="Comparison unavailable"
          description="Those items are no longer in the catalog. Clear the list to start over."
          action={
            <button
              type="button"
              className={buttonClassName({ size: "sm" })}
              onClick={() => clearCompare()}
            >
              Clear all
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("compare-root", className)}>
      {/* Print isolation by visibility rather than by hiding known chrome:
          the storefront's top bar and category nav sit outside <header>, so
          naming elements missed them. This keeps only the comparison. */}
      <style>{`
        @media print {
          @page { margin: 10mm; size: A4 landscape; }
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .compare-root, .compare-root * { visibility: visible !important; }
          .compare-root {
            position: absolute !important;
            inset: 0 auto auto 0;
            width: 100% !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          .compare-root table { font-size: 11px; }
          .compare-root .compare-cell { break-inside: avoid; }
        }
      `}</style>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[52rem] border-collapse">
          <thead>
            <tr>
              <th
                scope="col"
                className="w-64 border-b border-border px-4 py-5 text-left align-top"
              >
                <div className="space-y-3">
                  <div className="no-print flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className:
                          "border border-danger/50 text-danger hover:bg-danger/10",
                      })}
                      onClick={() => clearCompare()}
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className: "border border-border gap-1.5",
                      })}
                      onClick={() => window.print()}
                    >
                      <Printer aria-hidden className="size-4" />
                      Print
                    </button>
                    <button
                      type="button"
                      className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className:
                          "border border-primary/40 gap-1.5 text-primary hover:bg-primary-soft",
                      })}
                      onClick={() => void handleShare()}
                    >
                      <Share2 aria-hidden className="size-4" />
                      Share
                    </button>
                  </div>
                  <div>
                    <p className="text-xl font-bold tracking-tight text-text">
                      Product Comparison
                    </p>
                    <p className="mt-1 text-caption text-text-muted">
                      ({ordered.length}{" "}
                      {ordered.length === 1 ? "product" : "products"} selected)
                    </p>
                  </div>
                </div>
              </th>

              {ordered.map((product) => (
                <th
                  key={product.id}
                  scope="col"
                  className="compare-cell min-w-[15rem] border-b border-l border-border px-4 py-5 text-center align-top"
                >
                  <div className="relative mx-auto flex justify-end">
                    <button
                      type="button"
                      aria-label={`Remove ${product.name} from comparison`}
                      className="no-print inline-flex size-8 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger"
                      onClick={() => removeCompare(product.slug)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                  <Link
                    href={`/product/${product.slug}`}
                    className="mx-auto block"
                  >
                    <span className="relative mx-auto block aspect-square w-32 overflow-hidden rounded-md bg-surface">
                      <Image
                        src={product.image.src}
                        alt={product.image.alt}
                        fill
                        sizes="128px"
                        className="object-contain p-1"
                      />
                    </span>
                    <span className="mt-2 block text-label font-bold leading-snug text-text hover:text-primary">
                      {product.name}
                    </span>
                  </Link>
                  <p className="mt-1 text-caption text-text-muted">
                    Product ID:{" "}
                    <span className="font-mono text-text">{product.sku}</span>
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {product.compareAtPrice &&
                    product.compareAtPrice.amount > product.price.amount ? (
                      <p className="text-label tabular-nums text-text-muted">
                        Regular Price{" "}
                        <span className="line-through">
                          {formatMoney(product.compareAtPrice)}
                        </span>
                      </p>
                    ) : null}
                    <p className="text-body font-bold tabular-nums text-text">
                      {product.compareAtPrice &&
                      product.compareAtPrice.amount > product.price.amount
                        ? "Special Price "
                        : "Price "}
                      {formatMoney(product.price)}
                    </p>
                  </div>
                </th>
              ))}

              {remaining > 0 ? (
                <th
                  scope="col"
                  className="no-print w-72 border-b border-l border-border bg-surface-muted/40 px-4 py-5 text-center align-top"
                >
                  <p className="text-label font-bold text-text">Add More</p>
                  <div className="mt-3 space-y-2 text-left">
                    <label className="sr-only" htmlFor="compare-category">
                      Select product type
                    </label>
                    <select
                      id="compare-category"
                      className={selectClass}
                      value={activeCategory}
                      disabled={Boolean(lockedCategory)}
                      onChange={(event) => setPickedCategory(event.target.value)}
                    >
                      <option value="">Select Product Type</option>
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <label className="sr-only" htmlFor="compare-product">
                      Select product
                    </label>
                    <select
                      id="compare-product"
                      className={selectClass}
                      value=""
                      disabled={!activeCategory || adding}
                      onChange={(event) => handleAdd(event.target.value)}
                    >
                      <option value="">
                        {activeCategory
                          ? selectable.length > 0
                            ? "Type Product Name"
                            : "No other products here"
                          : "Select a type first"}
                      </option>
                      {selectable.map((item) => (
                        <option key={item.slug} value={item.slug}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-caption text-text-muted">
                      {lockedCategory
                        ? `${remaining} more can be added from this category.`
                        : `Compare up to ${MAX_COMPARE} products from one category.`}
                    </p>
                  </div>
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            <CompareRow label="Brand" span={remaining > 0}>
              {ordered.map((product) => (
                <td key={`${product.id}-brand`} className={cn(cellClass, "border-l")}>
                  {product.brandName}
                </td>
              ))}
            </CompareRow>

            <CompareRow label="Availability" span={remaining > 0}>
              {ordered.map((product) => (
                <td key={`${product.id}-stock`} className={cn(cellClass, "border-l")}>
                  {product.stockStatus.replaceAll("_", " ")}
                </td>
              ))}
            </CompareRow>

            <CompareRow label="Warranty" span={remaining > 0}>
              {ordered.map((product) => (
                <td
                  key={`${product.id}-warranty`}
                  className={cn(cellClass, "border-l")}
                >
                  {product.warrantyLabel || "—"}
                </td>
              ))}
            </CompareRow>

            {specLabels.map((label) => (
              <CompareRow key={label} label={label} span={remaining > 0}>
                {ordered.map((product) => (
                  <td
                    key={`${product.id}-${label}`}
                    className={cn(cellClass, "border-l")}
                  >
                    {product.specs.find((spec) => spec.label === label)?.value ??
                      "—"}
                  </td>
                ))}
              </CompareRow>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  span,
  children,
}: {
  label: string;
  span: boolean;
  children: React.ReactNode;
}) {
  return (
    <tr className="even:bg-surface-muted/40">
      <th
        scope="row"
        className={cn(cellClass, "text-left font-semibold text-text")}
      >
        {label}
      </th>
      {children}
      {span ? <td className={cn(cellClass, "no-print border-l")} /> : null}
    </tr>
  );
}
