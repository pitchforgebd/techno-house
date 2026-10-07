"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Frown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FeedProduct } from "@/lib/analytics/feeds";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function stockTone(status: FeedProduct["stockStatus"]) {
  if (status === "OUT_OF_STOCK") return "neutral" as const;
  if (status === "LOW_STOCK") return "warranty" as const;
  return "stock" as const;
}

export function AdminFacebookCatalogProductsPage({
  products,
  feedLive,
}: {
  products: FeedProduct[];
  feedLive: boolean;
}) {
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brandName.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [products, query]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-8">
      <p className="text-caption font-medium text-primary">
        <Link href="/admin/analytics" className="hover:underline">
          Marketing Analytics
        </Link>
        <span className="text-text-muted"> / </span>
        <Link
          href="/admin/integrations/facebook-catalog"
          className="hover:underline"
        >
          Meta Shop Sync
        </Link>
        <span className="text-text-muted"> / Products</span>
      </p>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 pt-5 sm:px-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              Facebook Catalog Products
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              These are the real products currently in your live feed —{" "}
              {/* A plain link, not <Link>: the feed is an XML file, not a page, so
                  <Link> would prefetch it as a page and log a 404 in the console. */}
              <a
                href="/feeds/facebook.xml"
                target="_blank"
                rel="noreferrer"
                className="text-[#3897f0]"
              >
                /feeds/facebook.xml
              </a>{" "}
              {feedLive
                ? `publishes all ${products.length} active product${products.length === 1 ? "" : "s"} shown below.`
                : "returns 404 until Meta Pixel is enabled on the Meta Pixel page."}{" "}
              There is no per-product selection — every active product is
              included automatically.
            </p>
          </div>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className={cn(controlClass, "pl-9")}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Thumb
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Name / Brand
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Category
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Price
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Availability
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-neutral-400">
                      <p className="text-sm">
                        {products.length === 0
                          ? "No active products — the live feed is currently empty."
                          : "No products match that search."}
                      </p>
                      <Frown className="size-10 opacity-40" aria-hidden />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell>
                      <div className="relative size-11 overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
                        {product.imageSrc ? (
                          <Image
                            src={product.imageSrc}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/product/${product.slug}`}
                        target="_blank"
                        className="font-medium text-neutral-900 hover:text-[#3897f0]"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xs text-neutral-500">
                        {product.brandName} · {product.sku}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-600">
                      {product.categoryName}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {product.priceAmount.toFixed(2)} {product.currency}
                    </TableCell>
                    <TableCell>
                      <Badge tone={stockTone(product.stockStatus)}>
                        {product.stockStatus.replace("_", " ").toLowerCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
