"use server";

import { revalidatePath } from "next/cache";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  createCustomerTicket,
  replyCustomerTicket,
} from "@/lib/support/customer-tickets";

export async function createTicketAction(input: {
  topic: string;
  subject: string;
  body: string;
}) {
  // These were the only customer-facing mutations without the origin check
  // that every sibling action file applies. Ownership was never at risk —
  // `createCustomerTicket` resolves the session itself and scopes by userId —
  // but the inconsistency is the kind of gap that gets copied into the next
  // action file (DSA-08 sweep).
  if (!(await isSameOriginRequest())) {
    return { ok: false as const, formError: CROSS_ORIGIN_ERROR };
  }
  const result = await createCustomerTicket(input);
  if (result.ok) {
    revalidatePath("/account/tickets");
    revalidatePath("/admin/support");
  }
  return result;
}

export async function replyTicketAction(input: {
  ticketId: string;
  body: string;
}) {
  if (!(await isSameOriginRequest())) {
    return { ok: false as const, formError: CROSS_ORIGIN_ERROR };
  }
  const result = await replyCustomerTicket(input);
  if (result.ok) {
    revalidatePath(`/account/tickets/${result.id}`);
    revalidatePath("/account/tickets");
    revalidatePath(`/admin/support/${result.id}`);
    revalidatePath("/admin/support");
  }
  return result;
}
