"use server";

import { redirect } from "next/navigation";
import {
  parseProductRequestDetails,
  parseProductRequestName,
} from "@/lib/support/product-request";

export async function submitProductRequest(formData: FormData) {
  const name = parseProductRequestName(formData.get("productName"));
  parseProductRequestDetails(formData.get("details"));

  if (!name) {
    redirect("/product-request?error=name");
  }

  redirect("/product-request?status=not-saved");
}
