"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import { saveNoteAction } from "@/features/admin/catalog/preset-actions";
import {
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import {
  NOTE_DESCRIPTION_MAX,
  NOTE_TYPES,
  type AdminNote,
  type AdminNoteType,
} from "@/lib/admin/notes-mock";

type FormMode = "create" | "edit";

function NoteFormFields({
  mode,
  note,
  onClose,
}: {
  mode: FormMode;
  note: AdminNote | null;
  onClose: () => void;
}) {
  const [type, setType] = useState<AdminNoteType>(note?.type ?? "Refund");
  const [description, setDescription] = useState(note?.description ?? "");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Enter a note description.");
      return;
    }
    if (trimmed.length > NOTE_DESCRIPTION_MAX) {
      setError(`Description must be ${NOTE_DESCRIPTION_MAX} characters or fewer.`);
      return;
    }

    startTransition(async () => {
      const result = await saveNoteAction({
        id: note?.id,
        type,
        description: trimmed,
      });
      if (!result.ok) {
        setError(result.formError);
        notifyError(result.formError);
        return;
      }
      notifySuccess({
        title: mode === "create" ? "Note created" : "Note saved",
        description: `${type} · ${trimmed.slice(0, 48)}${trimmed.length > 48 ? "…" : ""}`,
      });
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-4 px-5 py-5">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="note-type">Type</AdminFormLabel>
          <Select
            id="note-type"
            value={type}
            onChange={(event) => setType(event.target.value as AdminNoteType)}
            className={adminFormControlClass}
          >
            {NOTE_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="note-description" required>
            Description
          </AdminFormLabel>
          <p className="text-xs text-neutral-500">
            (Max {NOTE_DESCRIPTION_MAX} character)
          </p>
          <Textarea
            id="note-description"
            rows={6}
            value={description}
            maxLength={NOTE_DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
          />
          <p className="text-right text-xs text-neutral-400">
            {description.length}/{NOTE_DESCRIPTION_MAX}
          </p>
        </div>
      </div>

      <div className="flex justify-end border-t border-neutral-100 px-5 py-4">
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
        >
          {pending ? "Saving…" : "Confirm"}
        </Button>
      </div>
    </>
  );
}

export function AdminNoteFormModal({
  open,
  mode,
  note,
  onClose,
}: {
  open: boolean;
  mode: FormMode;
  note: AdminNote | null;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const formKey = `${mode}-${note?.id ?? "new"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close note form"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2
            id="note-modal-title"
            className="text-lg font-semibold text-neutral-800"
          >
            {mode === "create" ? "Add new note" : "Edit note"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <NoteFormFields
          key={formKey}
          mode={mode}
          note={note}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
