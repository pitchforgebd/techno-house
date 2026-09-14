/**
 * Admin product-request inbox — PostgreSQL `Complaint` rows with
 * source = PRODUCT_REQUEST (mock fallback when DATA_SOURCE=mock).
 */
import {
  MOCK_PRODUCT_REQUESTS,
  type AdminProductRequest,
  type ProductRequestStatus,
} from "@/lib/admin/product-requests-mock";
import { getPrisma } from "@/lib/db/prisma";
import type { ComplaintStatus as DbComplaintStatus } from "@/lib/generated/prisma/enums";

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function toStatus(status: DbComplaintStatus): ProductRequestStatus {
  switch (status) {
    case "ARCHIVED":
      return "closed";
    case "READ":
    case "REPLIED":
      return "reviewed";
    default:
      return "new";
  }
}

function toDbStatus(status: ProductRequestStatus): DbComplaintStatus {
  switch (status) {
    case "closed":
      return "ARCHIVED";
    case "reviewed":
      return "READ";
    default:
      return "NEW";
  }
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

type ComplaintRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  productWanted: string | null;
  staffNotes: string | null;
  status: DbComplaintStatus;
  createdAt: Date;
};

function toAdminProductRequest(row: ComplaintRow): AdminProductRequest {
  return {
    id: row.id,
    date: formatDate(row.createdAt),
    customerName: row.name,
    customerEmail: row.email,
    customerPhone: row.phone?.trim() || "—",
    productWanted: row.productWanted?.trim() || row.message.slice(0, 120),
    notes: row.message,
    status: toStatus(row.status),
    staffNotes: row.staffNotes?.trim() || undefined,
  };
}

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  message: true,
  productWanted: true,
  staffNotes: true,
  status: true,
  createdAt: true,
} as const;

export async function listAdminProductRequests(): Promise<AdminProductRequest[]> {
  if (!usesDatabase()) {
    return [...MOCK_PRODUCT_REQUESTS];
  }

  const rows = await getPrisma().complaint.findMany({
    where: { source: "PRODUCT_REQUEST" },
    orderBy: { createdAt: "desc" },
    select: SELECT,
  });
  return rows.map(toAdminProductRequest);
}

export async function getAdminProductRequestById(
  id: string,
): Promise<AdminProductRequest | null> {
  if (!usesDatabase()) {
    return MOCK_PRODUCT_REQUESTS.find((item) => item.id === id) ?? null;
  }

  const row = await getPrisma().complaint.findFirst({
    where: { id, source: "PRODUCT_REQUEST" },
    select: SELECT,
  });
  return row ? toAdminProductRequest(row) : null;
}

export async function updateAdminProductRequest(input: {
  id: string;
  status: ProductRequestStatus;
  staffNotes: string;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Database required — remove DATA_SOURCE=mock.",
    };
  }

  const existing = await getPrisma().complaint.findFirst({
    where: { id: input.id, source: "PRODUCT_REQUEST" },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That product request no longer exists." };
  }

  await getPrisma().complaint.update({
    where: { id: existing.id },
    data: {
      status: toDbStatus(input.status),
      staffNotes: input.staffNotes.trim().slice(0, 2000) || null,
    },
  });
  return { ok: true };
}
