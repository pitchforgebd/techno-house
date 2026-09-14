"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { deleteAdminAttributeAction } from "@/features/admin/attributes/attribute-actions";
import type { AdminAttribute } from "@/lib/admin/attributes-mock";

export function AdminAttributeRowActions({
  attribute,
  canDelete,
  onEdit,
}: {
  attribute: AdminAttribute;
  canDelete: boolean;
  onEdit: (attribute: AdminAttribute) => void;
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

  function handleDelete() {
    setOpen(false);
    if (!canDelete) {
      notifyError("You do not have permission to delete attributes.");
      return;
    }
    if (
      !window.confirm(
        `Delete “${attribute.name}”? Attributes still used on products cannot be deleted.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminAttributeAction(attribute.id);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not delete the attribute.");
        return;
      }
      notifySuccess("Attribute deleted");
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${attribute.name}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text"
        disabled={pending}
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-md border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-surface-muted"
            onClick={() => {
              setOpen(false);
              onEdit(attribute);
            }}
          >
            <Pencil className="size-4 text-text-muted" aria-hidden />
            Edit
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
