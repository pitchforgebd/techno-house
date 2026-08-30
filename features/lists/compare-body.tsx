"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadListProducts } from "@/features/lists/actions";
import { useListsStore } from "@/features/lists/use-lists-store";
import { MAX_COMPARE } from "@/lib/catalog/lists";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";

export function CompareBody({ className }: { className?: string }) {
  const { state, removeCompare, clearCompare } = useListsStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();

  const slugs = useMemo(
    () => state.compare.map((entry) => entry.slug),
    [state.compare],
  );

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

  const ordered = useMemo(() => {
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    return slugs
      .map((slug) => bySlug.get(slug))
      .filter((product): product is ProductSummary => Boolean(product));
  }, [products, slugs]);

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

  return (
    <div className={cn(className)}>
      {state.compare.length > 0 ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            className={buttonClassName({ variant: "ghost", size: "sm" })}
            onClick={() => clearCompare()}
          >
            Clear compare
          </button>
        </div>
      ) : null}

      {state.compare.length === 0 ? (
        <EmptyState
          title="No products to compare"
          description={`Add products with Compare on catalog cards. They must share the same category. Up to ${MAX_COMPARE} items.`}
          action={
            <Link href="/shop" className={buttonClassName({ size: "sm" })}>
              Browse shop
            </Link>
          }
        />
      ) : pending && ordered.length === 0 ? (
        <p className="text-body text-text-muted">Loading compare set…</p>
      ) : ordered.length === 0 ? (
        <EmptyState
          title="Compare products unavailable"
          description="Those items are no longer in the catalog. Clear the list to start over."
          action={
            <button
              type="button"
              className={buttonClassName({ size: "sm" })}
              onClick={() => clearCompare()}
            >
              Clear compare
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader scope="col">Spec</TableHeader>
                {ordered.map((product) => (
                  <TableHeader key={product.id} scope="col">
                    <div className="flex min-w-[10rem] flex-col gap-2">
                      <div className="relative aspect-[4/3] w-28 overflow-hidden rounded-md bg-surface">
                        <Image
                          src={product.image.src}
                          alt={product.image.alt}
                          fill
                          sizes="112px"
                          className="object-contain p-2"
                        />
                      </div>
                      <Link
                        href={`/product/${product.slug}`}
                        className="text-label font-semibold text-primary hover:underline"
                      >
                        {product.name}
                      </Link>
                      <button
                        type="button"
                        className={buttonClassName({
                          variant: "ghost",
                          size: "sm",
                          className: "self-start px-0",
                        })}
                        onClick={() => removeCompare(product.slug)}
                      >
                        Remove
                      </button>
                    </div>
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableHeader scope="row">Brand</TableHeader>
                {ordered.map((product) => (
                  <TableCell key={`${product.id}-brand`}>
                    {product.brandName}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHeader scope="row">Price</TableHeader>
                {ordered.map((product) => (
                  <TableCell key={`${product.id}-price`}>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(product.price)}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHeader scope="row">Stock</TableHeader>
                {ordered.map((product) => (
                  <TableCell key={`${product.id}-stock`}>
                    {product.stockStatus.replaceAll("_", " ")}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableHeader scope="row">Warranty</TableHeader>
                {ordered.map((product) => (
                  <TableCell key={`${product.id}-warranty`}>
                    {product.warrantyLabel}
                  </TableCell>
                ))}
              </TableRow>
              {specLabels.map((label) => (
                <TableRow key={label}>
                  <TableHeader scope="row">{label}</TableHeader>
                  {ordered.map((product) => {
                    const value =
                      product.specs.find((spec) => spec.label === label)
                        ?.value ?? "—";
                    return (
                      <TableCell key={`${product.id}-${label}`}>
                        {value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
