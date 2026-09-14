"use server";

import { revalidatePath } from "next/cache";
import {
  replyAdminTicket,
  updateAdminTicketStatus,
} from "@/lib/admin/load-support";
import type { TicketPriority, TicketStatus } from "@/lib/admin/support-mock";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

const TICKET_REPLY_PERMISSIONS = ["tickets.reply", "tickets.manage"];

function revalidateTicket(ticketId: string): void {
  revalidatePath(`/admin/support/${ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/account/tickets/${ticketId}`);
  revalidatePath("/account/tickets");
}

export async function replyAdminTicketAction(input: {
  ticketId: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await requireStaffSession();
  if (!hasAnyPermission(session, TICKET_REPLY_PERMISSIONS)) {
    return {
      ok: false,
      formError: "You do not have permission to reply to tickets.",
    };
  }

  const result = await replyAdminTicket({
    ticketId: input.ticketId,
    body: input.body,
    staffName: session.fullName,
  });
  if (!result.ok) {
    return result;
  }

  revalidateTicket(input.ticketId);
  return { ok: true };
}

export async function updateAdminTicketStatusAction(input: {
  ticketId: string;
  status: TicketStatus;
  priority: TicketPriority;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await requireStaffSession();
  if (!hasAnyPermission(session, ["tickets.manage"])) {
    return {
      ok: false,
      formError: "You do not have permission to manage tickets.",
    };
  }

  const result = await updateAdminTicketStatus(input);
  if (!result.ok) {
    return result;
  }

  revalidateTicket(input.ticketId);
  return { ok: true };
}
