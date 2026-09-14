"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LayoutGrid, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { deleteAdminCategoryAction } from "@/features/admin/categories/category-actions";

type AdminCategoryRowActionsProps = {
  slug: string;
  name: string;
  canDelete: boolean;
};

export function AdminCategoryRowActions({
  slug,
  name,
  canDelete,
}: AdminCategoryRowActionsProps) {
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
      notifyError("You do not have permission to delete categories.");
      return;
    }
    if (
      !window.confirm(
        `Delete “${name}”? Categories with products or subcategories cannot be deleted.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminCategoryAction(slug);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not delete the category.");
        return;
      }
      notifySuccess("Category deleted");
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${name}`}
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
            href={`/admin/categories/${slug}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <Pencil className="size-4 text-text-muted" aria-hidden />
            Edit
          </Link>
          <Link
            href={`/admin/products?category=${encodeURIComponent(slug)}`}
            className="flex items-center gap-2 px-3 py-2 text-body text-text hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            <LayoutGrid className="size-4 text-text-muted" aria-hidden />
            View products
          </Link>
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
