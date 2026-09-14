"use server";

import { getCustomerSession } from "@/lib/auth/customer-session";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationMutationResult,
} from "@/lib/notifications/inbox";
import { revalidatePath } from "next/cache";

async function requireCustomer(): Promise<
  { ok: true; userId: string } | { ok: false; formError: string }
> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to continue." };
  }
  return { ok: true, userId: session.userId };
}

export async function markNotificationReadAction(
  id: string,
): Promise<NotificationMutationResult> {
  const allowed = await requireCustomer();
  if (!allowed.ok) {
    return allowed;
  }
  const result = await markNotificationRead({
    userId: allowed.userId,
    id,
  });
  if (result.ok) {
    revalidatePath("/account/notifications");
  }
  return result;
}

export async function markAllNotificationsReadAction(): Promise<NotificationMutationResult> {
  const allowed = await requireCustomer();
  if (!allowed.ok) {
    return allowed;
  }
  const result = await markAllNotificationsRead({ userId: allowed.userId });
  if (result.ok) {
    revalidatePath("/account/notifications");
  }
  return result;
}
