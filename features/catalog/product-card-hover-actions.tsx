"use client";

import Link from "next/link";
import { ArrowLeftRight, Eye, Heart } from "lucide-react";
import {
  notifyError,
  notifyToast,
} from "@/components/ui/feedback-provider";
import { useListsStore } from "@/features/lists/use-lists-store";
import { cn } from "@/lib/cn";

const iconButtonClass =
  "inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-surface text-text-muted shadow-sm shadow-black/5 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary";

export function ProductCardHoverActions({
  slug,
  href,
  name,
  categorySlug,
}: {
  slug: string;
  href: string;
  name: string;
  categorySlug: string;
}) {
  const { state, toggleWishlist, toggleCompare } = useListsStore();
  const onWishlist = state.wishlist.includes(slug);
  const onCompare = state.compare.some((entry) => entry.slug === slug);

  return (
    // Bottom-right: the top-left corner flag and the top-right label badges
    // both own their corners on the card, so these slide up from below.
    <div className="absolute right-2.5 bottom-2.5 z-10 flex flex-row gap-1.5 transition-[opacity,transform] duration-300 ease-out focus-within:translate-y-0 focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 motion-safe:translate-y-1.5 motion-safe:opacity-0 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
      <button
        type="button"
        title="Wishlist"
        aria-label={
          onWishlist
            ? `Remove ${name} from wishlist`
            : `Add ${name} to wishlist`
        }
        aria-pressed={onWishlist}
        className={iconButtonClass}
        onClick={() => {
          const nextOn = !onWishlist;
          toggleWishlist(slug);
          notifyToast(nextOn ? "Added to wishlist" : "Removed from wishlist");
        }}
      >
        <Heart
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            "size-4",
            onWishlist ? "fill-danger text-danger" : "fill-none",
          )}
        />
      </button>

      <button
        type="button"
        title="Compare"
        aria-label={
          onCompare ? `Remove ${name} from compare` : `Add ${name} to compare`
        }
        aria-pressed={onCompare}
        className={iconButtonClass}
        onClick={() => {
          const result = toggleCompare(slug, categorySlug);
          if (!result.ok) {
            notifyError({ title: "Compare", description: result.reason });
            return;
          }
          notifyToast(onCompare ? "Removed from compare" : "Added to compare");
        }}
      >
        <ArrowLeftRight
          aria-hidden
          strokeWidth={1.5}
          className={cn("size-4", onCompare ? "text-text" : "")}
        />
      </button>

      <Link
        href={href}
        title="Quick view"
        aria-label={`Quick view ${name}`}
        className={iconButtonClass}
      >
        <Eye aria-hidden strokeWidth={1.5} className="size-4" />
      </Link>
    </div>
  );
}
