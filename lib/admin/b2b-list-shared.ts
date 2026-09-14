/**
 * Client-safe B2B admin list helpers (no Prisma / Node imports).
 */
import type { AdminListSearchParams } from "@/lib/admin/support-list-params";

export type AdminB2BTab = "all" | "pending" | "active" | "suspended";

const TABS: readonly AdminB2BTab[] = ["all", "pending", "active", "suspended"];

function first(raw: string | string[] | undefined): string {
  return Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
}

export function parseAdminB2BParams(searchParams: AdminListSearchParams): {
  tab: AdminB2BTab;
  q: string;
  page: number;
} {
  const tabRaw = first(searchParams.tab).trim();
  const tab = (TABS as string[]).includes(tabRaw) ? (tabRaw as AdminB2BTab) : "all";
  const q = first(searchParams.q).trim().slice(0, 120);
  const pageRaw = Number.parseInt(first(searchParams.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 500) : 1;
  return { tab, q, page };
}

export function adminB2BHref(params: {
  tab?: AdminB2BTab;
  q?: string;
  page?: number;
  base?: { tab: AdminB2BTab; q: string; page: number };
}): string {
  const base = params.base ?? { tab: "all" as AdminB2BTab, q: "", page: 1 };
  const next = {
    tab: params.tab ?? base.tab,
    q: params.q ?? base.q,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.tab !== "all") {
    query.set("tab", next.tab);
  }
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/customers/b2b?${qs}` : "/admin/customers/b2b";
}
