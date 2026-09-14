import type { MediaFolder } from "@/lib/admin/media-mock";
import type {
  ContactStatus,
  TicketPriority,
  TicketStatus,
} from "@/lib/admin/support-mock";

export const ADMIN_MEDIA_PAGE_SIZE = 24;
export const ADMIN_SUPPORT_PAGE_SIZE = 8;

export type MediaSort = "newest" | "oldest" | "name";

export type MediaListParams = {
  q: string;
  folder: "all" | MediaFolder;
  sort: MediaSort;
  page: number;
};

export type TicketListParams = {
  q: string;
  status: "all" | TicketStatus;
  priority: "all" | TicketPriority;
  page: number;
};

export type ContactListParams = {
  q: string;
  status: "all" | ContactStatus;
  page: number;
};

export type AdminListSearchParams = Record<
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

const FOLDERS = new Set(["all", "products", "brands", "home", "general"]);
const MEDIA_SORTS = new Set(["newest", "oldest", "name"]);
const TICKET_STATUSES = new Set(["all", "open", "pending", "resolved", "closed"]);
const PRIORITIES = new Set(["all", "low", "medium", "high", "urgent"]);
const CONTACT_STATUSES = new Set(["all", "new", "read", "replied", "archived"]);

export function parseMediaListParams(
  searchParams: AdminListSearchParams,
): MediaListParams {
  const folderRaw = first(searchParams.folder).trim() || "all";
  const sortRaw = first(searchParams.sort).trim() || "newest";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    folder: (FOLDERS.has(folderRaw)
      ? folderRaw
      : "all") as MediaListParams["folder"],
    sort: (MEDIA_SORTS.has(sortRaw)
      ? sortRaw
      : "newest") as MediaListParams["sort"],
    page: parsePage(first(searchParams.page)),
  };
}

export function parseTicketListParams(
  searchParams: AdminListSearchParams,
): TicketListParams {
  const statusRaw = first(searchParams.status).trim() || "all";
  const priorityRaw = first(searchParams.priority).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    status: (TICKET_STATUSES.has(statusRaw)
      ? statusRaw
      : "all") as TicketListParams["status"],
    priority: (PRIORITIES.has(priorityRaw)
      ? priorityRaw
      : "all") as TicketListParams["priority"],
    page: parsePage(first(searchParams.page)),
  };
}

export function parseContactListParams(
  searchParams: AdminListSearchParams,
): ContactListParams {
  const statusRaw = first(searchParams.status).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    status: (CONTACT_STATUSES.has(statusRaw)
      ? statusRaw
      : "all") as ContactListParams["status"],
    page: parsePage(first(searchParams.page)),
  };
}

export function mediaHref(
  params: Partial<MediaListParams> & { base?: MediaListParams },
): string {
  const base = params.base ?? {
    q: "",
    folder: "all" as const,
    sort: "newest" as const,
    page: 1,
  };
  const next = {
    q: params.q ?? base.q,
    folder: params.folder ?? base.folder,
    sort: params.sort ?? base.sort,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.folder !== "all") {
    query.set("folder", next.folder);
  }
  if (next.sort !== "newest") {
    query.set("sort", next.sort);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/media?${qs}` : "/admin/media";
}

export function ticketsHref(
  params: Partial<TicketListParams> & { base?: TicketListParams },
): string {
  const base = params.base ?? {
    q: "",
    status: "all" as const,
    priority: "all" as const,
    page: 1,
  };
  const next = {
    q: params.q ?? base.q,
    status: params.status ?? base.status,
    priority: params.priority ?? base.priority,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.status !== "all") {
    query.set("status", next.status);
  }
  if (next.priority !== "all") {
    query.set("priority", next.priority);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/support?${qs}` : "/admin/support";
}

export function contactsHref(
  params: Partial<ContactListParams> & { base?: ContactListParams },
): string {
  const base = params.base ?? { q: "", status: "all" as const, page: 1 };
  const next = {
    q: params.q ?? base.q,
    status: params.status ?? base.status,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.status !== "all") {
    query.set("status", next.status);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/contacts?${qs}` : "/admin/contacts";
}
