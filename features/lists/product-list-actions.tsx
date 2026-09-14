"use client";

import { useState } from "react";
import { ArrowLeftRight, Heart } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import {
  notifyError,
  notifyToast,
} from "@/components/ui/feedback-provider";
import { useListsStore } from "@/features/lists/use-lists-store";
import { cn } from "@/lib/cn";

export function ProductListActions({
  slug,
  categorySlug,
  variant = "labeled",
}: {
  slug: string;
  categorySlug: string;
  variant?: "labeled" | "icons";
}) {
  const { state, toggleWishlist, toggleCompare } = useListsStore();
  const [message, setMessage] = useState<string | null>(null);

  const onWishlist = state.wishlist.includes(slug);
  const onCompare = state.compare.some((entry) => entry.slug === slug);

  if (variant === "icons") {
    return (
      <div className="space-y-2">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm shadow-black/5 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            aria-pressed={onWishlist}
            aria-label={onWishlist ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => {
              setMessage(null);
              const nextOn = !onWishlist;
              toggleWishlist(slug);
              notifyToast(
                nextOn ? "Added to wishlist" : "Removed from wishlist",
              );
            }}
          >
            <Heart
              aria-hidden
              strokeWidth={1.75}
              className={cn(
                "size-4",
                onWishlist ? "fill-danger text-danger" : "fill-none",
              )}
            />
          </button>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm shadow-black/5 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
            aria-pressed={onCompare}
            aria-label={onCompare ? "Remove from compare" : "Add to compare"}
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
            <ArrowLeftRight
              aria-hidden
              strokeWidth={1.75}
              className={cn("size-4", onCompare ? "text-primary" : "")}
            />
          </button>
        </div>
        {message ? (
          <p className="text-center text-caption text-danger" role="status">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "flex-1 gap-1.5 border border-border",
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
          <Heart
            aria-hidden
            strokeWidth={1.75}
            className={cn(
              "size-4 shrink-0",
              onWishlist ? "fill-danger text-danger" : "fill-none",
            )}
          />
          {onWishlist ? "Saved" : "Wishlist"}
        </button>
        <button
          type="button"
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "flex-1 gap-1.5 border border-border",
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
          <ArrowLeftRight
            aria-hidden
            strokeWidth={1.75}
            className={cn(
              "size-4 shrink-0",
              onCompare ? "text-primary" : "",
            )}
          />
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
