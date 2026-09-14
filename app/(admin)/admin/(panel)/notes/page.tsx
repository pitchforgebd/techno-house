import type { Metadata } from "next";
import { AdminNoteList } from "@/features/admin/notes/admin-note-list";
import { loadAdminNoteList } from "@/lib/admin/load-notes";
import {
  parseAdminNoteListParams,
  type AdminNoteSearchParams,
} from "@/lib/admin/notes-list-params";

export const metadata: Metadata = {
  title: "Notes",
};

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Promise<AdminNoteSearchParams>;
}) {
  const raw = await searchParams;
  const params = parseAdminNoteListParams(raw);
  const data = await loadAdminNoteList(params);
  return (
    <AdminNoteList
      items={data.items}
      total={data.total}
      params={data.params}
    />
  );
}
