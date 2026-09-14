"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Eye,
  MoreVertical,
  MessageSquarePlus,
  Shield,
  Trash2,
} from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { deleteAdminReviewsForProductAction } from "@/features/admin/reviews/review-actions";

export function AdminReviewRowActions({
  productSlug,
  productName,
  canAdd,
  canDelete,
}: {
  productSlug: string;
  productName: string;
  canAdd: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleClear() {
    setOpen(false);
    if (!canDelete) {
      notifyError("You do not have permission to delete reviews.");
      return;
    }
    if (
      !window.confirm(
        `Delete all reviews for “${productName}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminReviewsForProductAction(productSlug);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not delete reviews.");
        return;
      }
      notifySuccess("Reviews cleared");
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${productName}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-blue-100 text-text-muted hover:bg-blue-50 hover:text-text"
        disabled={pending}
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-md border border-border bg-surface py-1 shadow-lg">
          <Link
            href={`/product/${productSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Eye className="size-4 text-text-muted" aria-hidden />
            View on store
          </Link>
          <Link
            href={`/admin/reviews/${productSlug}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Shield className="size-4 text-text-muted" aria-hidden />
            Moderate reviews
          </Link>
          {canAdd ? (
            <Link
              href={`/admin/reviews/new?product=${encodeURIComponent(productSlug)}`}
              className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
              onClick={() => setOpen(false)}
            >
              <MessageSquarePlus
                className="size-4 text-text-muted"
                aria-hidden
              />
              Add custom review
            </Link>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-red-500 hover:bg-red-50"
              onClick={handleClear}
              disabled={pending}
            >
              <Trash2 className="size-4" aria-hidden />
              Clear reviews
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
