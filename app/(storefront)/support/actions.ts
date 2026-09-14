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

/**
 * Support-hub form submit.
 *
 * Same pipeline as the footer Complaint Box (`submitComplaint`), tagged
 * `SUPPORT` so Admin → Contacts can tell the two apart. Redirect-based
 * status keeps the form working without client JavaScript.
 */
export async function submitSupportRequest(formData: FormData) {
  // Consistent with every other mutating action in the app (DSA-08
  // sweep): Server Actions already reject cross-site posts, this is the
  // same defence-in-depth the rest of the codebase applies.
  if (!(await isSameOriginRequest())) {
    redirect("/support?error=save");
  }
  // Unauthenticated form, so throttle it — otherwise a script can fill
  // the staff queue for free (F-12).
  const meta = await getRequestMeta();
  const limited = await limitPublicForm(meta.ip);
  if (!limited.ok) {
    redirect("/support?error=throttled");
  }

  const session = await getCustomerSession();
  const input = createComplaintFromForm(
    formData,
    session?.userId ?? null,
    "SUPPORT",
  );
  const result = await createComplaint(input);

  if (!result.ok) {
    const field =
      result.field === "name" ||
      result.field === "email" ||
      result.field === "message"
        ? result.field
        : "save";
    redirect(`/support?error=${field}#support-form`);
  }

  revalidatePath("/admin/contacts");
  redirect("/support?status=sent#support-form");
}
