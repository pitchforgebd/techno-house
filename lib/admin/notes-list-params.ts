export type AdminNoteListParams = {
  q: string;
};

export type AdminNoteSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

export function parseAdminNoteListParams(
  searchParams: AdminNoteSearchParams,
): AdminNoteListParams {
  return {
    q: first(searchParams.q).trim().slice(0, 120),
  };
}

export function adminNotesHref(
  params: Partial<AdminNoteListParams> & { base?: AdminNoteListParams },
): string {
  const base = params.base ?? { q: "" };
  const next = { q: params.q ?? base.q };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  const qs = query.toString();
  return qs ? `/admin/notes?${qs}` : "/admin/notes";
}
