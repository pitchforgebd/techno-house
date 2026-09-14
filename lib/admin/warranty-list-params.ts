export type AdminWarrantyListParams = {
  q: string;
};

export type AdminWarrantySearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

export function parseAdminWarrantyListParams(
  searchParams: AdminWarrantySearchParams,
): AdminWarrantyListParams {
  return {
    q: first(searchParams.q).trim().slice(0, 120),
  };
}

export function adminWarrantiesHref(
  params: Partial<AdminWarrantyListParams> & {
    base?: AdminWarrantyListParams;
  },
): string {
  const base = params.base ?? { q: "" };
  const next = { q: params.q ?? base.q };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  const qs = query.toString();
  return qs ? `/admin/warranty?${qs}` : "/admin/warranty";
}
