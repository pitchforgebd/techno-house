"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Copy, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  cloneAdminProductAction,
  deleteAdminProductAction,
} from "@/features/admin/products/product-actions";

type AdminProductRowActionsProps = {
  productId: string;
  productSlug: string;
  productName: string;
  canDelete: boolean;
};

export function AdminProductRowActions({
  productId,
  productSlug,
  productName,
  canDelete,
}: AdminProductRowActionsProps) {
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

  function handleDelete() {
    setOpen(false);
    if (!canDelete) {
      notifyError("You do not have permission to delete products.");
      return;
    }
    if (
      !window.confirm(
        `Delete “${productName}”? Products on orders or campaigns cannot be deleted.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminProductAction(productId);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not delete the product.");
        return;
      }
      notifySuccess("Product deleted");
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
        className="inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text"
        disabled={pending}
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-md border border-border bg-surface py-1 shadow-lg">
          <Link
            href={`/admin/products/${productId}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Pencil className="size-4 text-text-muted" aria-hidden />
            Edit
          </Link>
          <Link
            href={`/product/${productSlug}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye className="size-4 text-text-muted" aria-hidden />
            View product
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const result = await cloneAdminProductAction(productId);
                if (!result.ok) {
                  notifyError(result.formError);
                  return;
                }
                notifySuccess("Product cloned — opening the new draft");
                router.push(`/admin/products/${result.id}`);
                router.refresh();
              });
            }}
          >
            <Copy className="size-4 text-text-muted" aria-hidden />
            Make a clone
          </button>
          {canDelete ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-red-600 hover:bg-red-50"
              onClick={handleDelete}
              disabled={pending}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
