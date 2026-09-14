export type AdminUnitListParams = {
  q: string;
};

export type AdminUnitSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

export function parseAdminUnitListParams(
  searchParams: AdminUnitSearchParams,
): AdminUnitListParams {
  return {
    q: first(searchParams.q).trim().slice(0, 120),
  };
}

export function adminUnitsHref(
  params: Partial<AdminUnitListParams> & { base?: AdminUnitListParams },
): string {
  const base = params.base ?? { q: "" };
  const next = { q: params.q ?? base.q };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  const qs = query.toString();
  return qs ? `/admin/units?${qs}` : "/admin/units";
}
