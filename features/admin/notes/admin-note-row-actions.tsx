"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { deleteNoteAction } from "@/features/admin/catalog/preset-actions";
import type { AdminNote } from "@/lib/admin/notes-mock";

export function AdminNoteRowActions({
  note,
  onEdit,
}: {
  note: AdminNote;
  onEdit: (note: AdminNote) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Options for ${note.type} note`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-blue-100 text-text-muted hover:bg-blue-50 hover:text-text"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-[8.5rem] rounded-md border border-border bg-surface py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-text hover:bg-blue-50"
            onClick={() => {
              setOpen(false);
              onEdit(note);
            }}
          >
            <Pencil className="size-4 text-text-muted" aria-hidden />
            Edit
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-body text-red-500 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              if (
                !window.confirm(
                  "Delete this item? This cannot be undone.",
                )
              ) {
                return;
              }
              startTransition(async () => {
                const result = await deleteNoteAction(note.id);
                if (!result.ok) {
                  notifyError(result.formError);
                  return;
                }
                notifySuccess("Note deleted");
                router.refresh();
              });
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
