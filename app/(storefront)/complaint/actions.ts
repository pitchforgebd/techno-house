"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createComplaint,
  createComplaintFromForm,
} from "@/lib/support/create-complaint";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { limitPublicForm } from "@/lib/auth/rate-limit";
import { isSameOriginRequest } from "@/lib/auth/same-origin";

export async function submitComplaint(formData: FormData) {
  // Consistent with every other mutating action in the app (DSA-08
  // sweep): Server Actions already reject cross-site posts, this is the
  // same defence-in-depth the rest of the codebase applies.
  if (!(await isSameOriginRequest())) {
    redirect("/complaint?error=save");
  }
  // Unauthenticated form, so throttle it — otherwise a script can fill
  // the staff queue for free (F-12).
  const meta = await getRequestMeta();
  const limited = await limitPublicForm(meta.ip);
  if (!limited.ok) {
    redirect("/complaint?error=throttled");
  }

  const session = await getCustomerSession();
  const input = createComplaintFromForm(formData, session?.userId ?? null);
  const result = await createComplaint(input);

  if (!result.ok) {
    if (result.field === "name") {
      redirect("/complaint?error=name");
    }
    if (result.field === "email") {
      redirect("/complaint?error=email");
    }
    if (result.field === "message") {
      redirect("/complaint?error=message");
    }
    redirect("/complaint?error=save");
  }

  revalidatePath("/admin/contacts");
  redirect("/complaint?status=sent");
}
