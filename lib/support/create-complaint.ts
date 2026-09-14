import { getPrisma } from "@/lib/db/prisma";
import {
  notifyStaffSafe,
  STAFF_ALERT_TYPES,
} from "@/lib/orders/staff-order-alerts";

export const COMPLAINT_NAME_MAX = 120;
export const COMPLAINT_EMAIL_MAX = 160;
export const COMPLAINT_PHONE_MAX = 40;
export const COMPLAINT_SUBJECT_MAX = 150;
export const COMPLAINT_MESSAGE_MAX = 2000;

/**
 * Which storefront form produced the row. Admin → Contacts lists this so
 * staff can tell a footer complaint from a support question without opening
 * it, and `Complaint.source` is indexed for filtering. Defaults to FOOTER
 * because that was this function's only caller when it was written.
 */
export type ComplaintFormSource = "FOOTER" | "CONTACT_FORM" | "SUPPORT";

export type CreateComplaintInput = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  userId?: string | null;
  source?: ComplaintFormSource;
};

export type CreateComplaintResult =
  | { ok: true; id: string }
  | {
      ok: false;
      formError: string;
      field?: "name" | "email" | "message";
    };

function parseName(raw: string): string {
  return raw.trim().slice(0, COMPLAINT_NAME_MAX);
}

function parseEmail(raw: string): string {
  return raw.trim().slice(0, COMPLAINT_EMAIL_MAX).toLowerCase();
}

function parsePhone(raw: string): string | null {
  const value = raw.trim().slice(0, COMPLAINT_PHONE_MAX);
  return value || null;
}

function parseSubject(raw: string): string {
  return raw.trim().replace(/[<>]/g, "").slice(0, COMPLAINT_SUBJECT_MAX);
}

function parseMessage(raw: string): string {
  return raw.trim().slice(0, COMPLAINT_MESSAGE_MAX);
}

/**
 * The complaint form asks for the details in one box (no separate subject
 * field), but Admin → Contacts lists complaints by subject — so derive a
 * readable one from the opening of the message.
 */
function deriveSubject(message: string): string {
  const firstLine = message.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const source = firstLine || message;
  if (source.length <= 80) {
    return source;
  }
  const clipped = source.slice(0, 80);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createComplaintFromForm(
  formData: FormData,
  userId?: string | null,
  source: ComplaintFormSource = "FOOTER",
): CreateComplaintInput {
  return {
    source,
    name: parseName(String(formData.get("name") ?? "")),
    email: parseEmail(String(formData.get("email") ?? "")),
    phone: String(formData.get("phone") ?? ""),
    subject: parseSubject(String(formData.get("subject") ?? "")),
    message: parseMessage(String(formData.get("message") ?? "")),
    userId: userId ?? null,
  };
}

/** Real customer complaints — the footer "Complaint Box" form. Lands in Admin → Contacts. */
export async function createComplaint(
  input: CreateComplaintInput,
): Promise<CreateComplaintResult> {
  const name = parseName(input.name);
  const email = parseEmail(input.email);
  const subject = parseSubject(input.subject);
  const message = parseMessage(input.message);
  const phone = parsePhone(input.phone);

  if (!name) {
    return { ok: false, formError: "Enter your name.", field: "name" };
  }
  if (!email || !looksLikeEmail(email)) {
    return {
      ok: false,
      formError: "Enter a valid email address.",
      field: "email",
    };
  }
  if (!message) {
    return {
      ok: false,
      formError: "Describe the problem.",
      field: "message",
    };
  }

  const resolvedSubject = subject || deriveSubject(message);

  const row = await getPrisma().complaint.create({
    data: {
      userId: input.userId || null,
      name,
      email,
      phone,
      subject: resolvedSubject,
      message,
      status: "NEW",
      source: input.source ?? "FOOTER",
    },
    select: { id: true },
  });

  notifyStaffSafe({
    type: STAFF_ALERT_TYPES.COMPLAINT,
    title:
      (input.source ?? "FOOTER") === "SUPPORT"
        ? "New support request"
        : "New complaint",
    body: `${name} · ${resolvedSubject}`,
    href: `/admin/contacts/${row.id}`,
  });

  return { ok: true, id: row.id };
}
