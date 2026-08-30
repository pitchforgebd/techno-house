"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import {
  notifyError,
  notifyToast,
} from "@/components/ui/feedback-provider";
import { useListsStore } from "@/features/lists/use-lists-store";

export function ProductListActions({
  slug,
  categorySlug,
}: {
  slug: string;
  categorySlug: string;
}) {
  const { state, toggleWishlist, toggleCompare } = useListsStore();
  const [message, setMessage] = useState<string | null>(null);

  const onWishlist = state.wishlist.includes(slug);
  const onCompare = state.compare.some((entry) => entry.slug === slug);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "flex-1 border border-border",
          })}
          aria-pressed={onWishlist}
          onClick={() => {
            setMessage(null);
            const nextOn = !onWishlist;
            toggleWishlist(slug);
            notifyToast(
              nextOn ? "Added to wishlist" : "Removed from wishlist",
            );
          }}
        >
          {onWishlist ? "Saved" : "Wishlist"}
        </button>
        <button
          type="button"
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "flex-1 border border-border",
          })}
          aria-pressed={onCompare}
          onClick={() => {
            const result = toggleCompare(slug, categorySlug);
            if (!result.ok) {
              setMessage(result.reason);
              notifyError({
                title: "Compare",
                description: result.reason,
              });
              return;
            }
            setMessage(null);
            const nextOn = !onCompare;
            notifyToast(
              nextOn ? "Added to compare" : "Removed from compare",
            );
          }}
        >
          {onCompare ? "In compare" : "Compare"}
        </button>
      </div>
      {message ? (
        <p className="text-caption text-danger" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
