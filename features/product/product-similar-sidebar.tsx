"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, Eye } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { notifyError, notifyToast } from "@/components/ui/feedback-provider";
import { useListsStore } from "@/features/lists/use-lists-store";
import { useCartStore } from "@/features/cart/use-cart-store";
import type { ProductSummary } from "@/lib/data";
import { formatMoney } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

function SimilarProductCard({ product }: { product: ProductSummary }) {
  const { addItem } = useCartStore();
  const { toggleCompare } = useListsStore();
  const unavailable = product.stockStatus === "out_of_stock";

  return (
    <article className="border border-border bg-surface p-3">
      <div className="flex gap-3">
        <Link
          href={`/product/${product.slug}`}
          className="relative size-20 shrink-0 overflow-hidden border border-border bg-surface-muted"
        >
          <Image
            src={product.image.src}
            alt={product.image.alt}
            fill
            sizes="80px"
            className="object-contain p-1.5"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/product/${product.slug}`}
            className="line-clamp-2 text-caption font-semibold leading-snug text-text hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-1 text-label font-semibold tabular-nums text-text">
            {formatMoney(product.price)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={unavailable}
              className={buttonClassName({
                size: "sm",
                className: "min-h-9 flex-1 px-3 text-caption",
              })}
              onClick={() => {
                if (unavailable) {
                  notifyError({
                    title: "Out of stock",
                    description:
                      "This item cannot be added while out of stock.",
                  });
                  return;
                }
                void addItem(product.slug, 1).then((result) => {
                  if (!result.ok) {
                    notifyError({
                      title: "Could not add to cart",
                      description: result.reason,
                    });
                    return;
                  }
                  notifyToast("Added to cart");
                });
              }}
            >
              {unavailable ? "Out of stock" : "Add to cart"}
            </button>
            <button
              type="button"
              aria-label={`Compare ${product.name}`}
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "size-9 min-w-9 border border-border px-0",
              })}
              onClick={() => {
                const result = toggleCompare(
                  product.slug,
                  product.categorySlug,
                );
                if (!result.ok) {
                  notifyError({ title: "Compare", description: result.reason });
                  return;
                }
                notifyToast("Compare list updated");
              }}
            >
              <ArrowLeftRight
                aria-hidden
                className="size-4"
                strokeWidth={1.75}
              />
            </button>
            <Link
              href={`/product/${product.slug}`}
              aria-label={`Quick view ${product.name}`}
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "size-9 min-w-9 border border-border px-0",
              })}
            >
              <Eye aria-hidden className="size-4" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductSimilarSidebar({
  products,
  className,
}: {
  products: ProductSummary[];
  className?: string;
}) {
  return (
    <aside
      className={cn("min-w-0", className)}
      aria-labelledby="similar-products-heading"
    >
      <div className="flex items-stretch">
        <h2
          id="similar-products-heading"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          Similar products
        </h2>
        <div className="min-w-0 flex-1 border-b-2 border-text" />
      </div>

      {products.length === 0 ? (
        <p className="mt-4 border border-border bg-surface px-4 py-6 text-caption text-text-muted">
          No similar products listed for this item yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3" role="list">
          {products.map((product) => (
            <li key={product.id}>
              <SimilarProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
