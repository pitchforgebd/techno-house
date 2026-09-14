"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProductRequest,
  createProductRequestFromForm,
} from "@/lib/support/create-product-request";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { limitPublicForm } from "@/lib/auth/rate-limit";
import { isSameOriginRequest } from "@/lib/auth/same-origin";

export async function submitProductRequest(formData: FormData) {
  // Consistent with every other mutating action in the app (DSA-08
  // sweep): Server Actions already reject cross-site posts, this is the
  // same defence-in-depth the rest of the codebase applies.
  if (!(await isSameOriginRequest())) {
    redirect("/product-request?error=save");
  }
  // Unauthenticated form, so throttle it — otherwise a script can fill
  // the staff queue for free (F-12).
  const meta = await getRequestMeta();
  const limited = await limitPublicForm(meta.ip);
  if (!limited.ok) {
    redirect("/product-request?error=throttled");
  }

  const session = await getCustomerSession();
  const input = createProductRequestFromForm(formData, session?.userId ?? null);
  const result = await createProductRequest(input);

  if (!result.ok) {
    if (result.field === "name") {
      redirect("/product-request?error=name");
    }
    if (result.field === "email") {
      redirect("/product-request?error=email");
    }
    if (result.field === "product") {
      redirect("/product-request?error=product");
    }
    redirect("/product-request?error=save");
  }

  revalidatePath("/admin/product-requests");
  redirect("/product-request?status=sent");
}
