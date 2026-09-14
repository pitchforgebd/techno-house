import { listAdminNotes } from "@/lib/catalog/admin-presets";
import type { AdminNote } from "@/lib/admin/notes-mock";
import type { AdminNoteListParams } from "@/lib/admin/notes-list-params";

export type AdminNoteListResult = {
  items: AdminNote[];
  total: number;
  params: AdminNoteListParams;
};

/** Real `ProductNotePreset` rows (Phase 3) — was a hardcoded mock array. */
export async function loadAdminNoteList(
  params: AdminNoteListParams,
): Promise<AdminNoteListResult> {
  let items = await listAdminNotes();

  if (params.q) {
    const needle = params.q.toLowerCase();
    items = items.filter(
      (note) =>
        note.description.toLowerCase().includes(needle) ||
        note.type.toLowerCase().includes(needle),
    );
  }

  return { items, total: items.length, params };
}
