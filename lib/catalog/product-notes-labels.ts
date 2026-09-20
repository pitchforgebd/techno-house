/**
 * Product note/label presets — Phase 3, split for client safety in Phase 14.
 *
 * Backed by `ProductNotePreset` / `ProductLabelPreset`, so what an admin
 * edits under `/admin/notes` and `/admin/labels` is what the product form
 * offers and what the storefront renders.
 *
 * This file holds only the client-safe pieces (types + pure functions) —
 * `admin-product-notes-labels-fields.tsx` (a Client Component) imports
 * `notesForType`/`NOTE_TYPES` directly. The real, Prisma-backed option
 * loaders and id validators live in `product-notes-labels-server.ts`
 * instead; importing them from here would pull `pg`/Node built-ins into
 * the client bundle and break the production build.
 */
import { NOTE_TYPES, type AdminNoteType } from "@/lib/admin/notes-mock";

export const PRODUCT_NOTE_MAX = 12;
export const PRODUCT_LABEL_MAX = 8;

export type AdminLabelTextTone = "light" | "dark";

export type ProductNoteOption = {
  id: string;
  type: AdminNoteType;
  description: string;
};

export type ProductLabelOption = {
  id: string;
  text: string;
  backgroundColor: string;
  textTone: AdminLabelTextTone;
};

export type ProductNoteView = ProductNoteOption;
export type ProductLabelView = ProductLabelOption;

/** Preloaded catalogues handed to the synchronous mappers. */
export type ProductPresetLookup = {
  notes: Map<string, ProductNoteView>;
  labels: Map<string, ProductLabelView>;
  /** Product ids currently in a live Promotion campaign — drives the "Offer" ribbon. */
  activeOfferProductIds: Set<string>;
};

export const EMPTY_PRESET_LOOKUP: ProductPresetLookup = {
  notes: new Map(),
  labels: new Map(),
  activeOfferProductIds: new Set(),
};

export function notesForType(
  notes: ProductNoteOption[],
  type: AdminNoteType,
): ProductNoteOption[] {
  return notes.filter((note) => note.type === type);
}

export function resolveProductNotes(
  ids: string[],
  lookup: ProductPresetLookup,
): ProductNoteView[] {
  const out: ProductNoteView[] = [];
  for (const id of ids) {
    const note = lookup.notes.get(id);
    if (note) {
      out.push(note);
    }
  }
  return out;
}

export function resolveProductLabels(
  ids: string[],
  lookup: ProductPresetLookup,
): ProductLabelView[] {
  const out: ProductLabelView[] = [];
  for (const id of ids) {
    const label = lookup.labels.get(id);
    if (label) {
      out.push(label);
    }
  }
  return out;
}

export { NOTE_TYPES };
export type { AdminNoteType };
