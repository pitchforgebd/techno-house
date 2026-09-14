"use client";

import Link from "next/link";
import {
  AdminFormLabel,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminLabelBadge } from "@/features/admin/labels/admin-label-badge";
import type {
  ProductLabelOption,
  ProductNoteOption,
} from "@/lib/catalog/product-notes-labels";
import { notesForType, NOTE_TYPES } from "@/lib/catalog/product-notes-labels";
import type { AdminNoteType } from "@/lib/admin/notes-mock";

export function AdminProductLabelsFields({
  labels,
  selectedIds,
  onChange,
}: {
  labels: ProductLabelOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((item) => item !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AdminFormLabel>Product labels</AdminFormLabel>
        <Link
          href="/admin/labels"
          className="text-xs font-medium text-[#3897f0] hover:underline"
        >
          Manage labels
        </Link>
      </div>
      <p className="text-xs text-neutral-500">
        Select badges shown on the product page and listing cards.
      </p>
      {labels.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          No labels available. Add labels under Admin → Labels.
        </p>
      ) : (
        <ul className="space-y-2">
          {labels.map((label) => {
            const checked = selectedIds.includes(label.id);
            return (
              <li key={label.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-[#3897f0]"
                    checked={checked}
                    onChange={(event) => toggle(label.id, event.target.checked)}
                  />
                  <AdminLabelBadge
                    text={label.text}
                    backgroundColor={label.backgroundColor}
                    textTone={label.textTone}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminProductNotesFields({
  notes,
  selectedIds,
  onChange,
  types = [...NOTE_TYPES],
  title = "Product notes",
  compact = false,
}: {
  notes: ProductNoteOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  types?: AdminNoteType[];
  title?: string;
  compact?: boolean;
}) {
  function toggle(id: string, checked: boolean) {
    if (checked) {
      onChange([...selectedIds, id]);
      return;
    }
    onChange(selectedIds.filter((item) => item !== id));
  }

  const sections = types
    .map((type) => ({
      type,
      items: notesForType(notes, type),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AdminFormLabel>{title}</AdminFormLabel>
          <Link
            href="/admin/notes"
            className="text-xs font-medium text-[#3897f0] hover:underline"
          >
            Manage notes
          </Link>
        </div>
      ) : (
        <AdminFormLabel>{title}</AdminFormLabel>
      )}
      {!compact ? (
        <p className="text-xs text-neutral-500">
          Attach preset notes for shipping, warranty, refund, and delivery on
          the product page.
        </p>
      ) : null}
      {sections.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-600">
          No notes for this section.
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.type} className="space-y-2">
              {!compact || types.length > 1 ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {section.type}
                </p>
              ) : null}
              <ul className="space-y-2">
                {section.items.map((note) => {
                  const checked = selectedIds.includes(note.id);
                  return (
                    <li key={note.id}>
                      <label className="flex cursor-pointer gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-[#3897f0]"
                          checked={checked}
                          onChange={(event) =>
                            toggle(note.id, event.target.checked)
                          }
                        />
                        <span className="min-w-0 leading-snug">
                          {note.description}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
