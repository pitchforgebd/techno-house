export const ADMIN_ATTRIBUTE_PAGE_SIZE = 12;

export type AdminAttributeListParams = {
  q: string;
  page: number;
};

export type AdminAttributeSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(n, 500);
}

export function parseAdminAttributeListParams(
  searchParams: AdminAttributeSearchParams,
): AdminAttributeListParams {
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    page: parsePage(first(searchParams.page)),
  };
}

export function adminAttributesHref(
  params: Partial<AdminAttributeListParams> & {
    base?: AdminAttributeListParams;
  },
): string {
  const base: AdminAttributeListParams = params.base ?? { q: "", page: 1 };
  const next: AdminAttributeListParams = {
    q: params.q ?? base.q,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/attributes?${qs}` : "/admin/attributes";
}
