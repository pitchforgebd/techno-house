"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/features/catalog/product-card";
import { loadListProducts } from "@/features/lists/actions";
import { useListsStore } from "@/features/lists/use-lists-store";
import { PRODUCT_CARD_GRID_CLASS } from "@/features/catalog/product-grid";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/lib/data";

export function WishlistBody({ className }: { className?: string }) {
  const { state, removeWishlist, clearWishlist } = useListsStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const items = await loadListProducts(state.wishlist);
      if (!cancelled) {
        setProducts(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.wishlist]);

  return (
    <div className={cn(className)}>
      {state.wishlist.length > 0 ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            className={buttonClassName({ variant: "ghost", size: "sm" })}
            onClick={() => clearWishlist()}
          >
            Clear wishlist
          </button>
        </div>
      ) : null}

      {state.wishlist.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Save products from the catalog with Wishlist. Browse the shop to get started."
          action={
            <Link href="/shop" className={buttonClassName({ size: "sm" })}>
              Browse shop
            </Link>
          }
        />
      ) : pending && products.length === 0 ? (
        <p className="text-body text-text-muted">Loading saved products…</p>
      ) : products.length === 0 ? (
        <EmptyState
          title="Saved products unavailable"
          description="Those items are no longer in the catalog. Clear the list to start over."
          action={
            <button
              type="button"
              className={buttonClassName({ size: "sm" })}
              onClick={() => clearWishlist()}
            >
              Clear wishlist
            </button>
          }
        />
      ) : (
        <ul className={PRODUCT_CARD_GRID_CLASS}>
          {products.map((product) => (
            <li key={product.id} className="flex flex-col gap-2">
              <ProductCard product={product} />
              <button
                type="button"
                className={buttonClassName({
                  variant: "ghost",
                  size: "sm",
                  className: "self-start",
                })}
                onClick={() => removeWishlist(product.slug)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
