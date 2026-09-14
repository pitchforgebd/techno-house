"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  importProductsFromCsvText,
  type ImportCsvResult,
} from "@/lib/catalog/bulk-csv";

export async function importProductsCsvAction(
  csvText: string,
): Promise<ImportCsvResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("product.bulk_upload");
  if (!allowed.ok) {
    return allowed;
  }
  if (csvText.length > 5_000_000) {
    return { ok: false, formError: "CSV file is too large (max 5 MB)." };
  }
  const meta = await getRequestMeta();
  const result = await importProductsFromCsvText(csvText, {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  });
  if (result.ok && (result.summary.created > 0 || result.summary.updated > 0)) {
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
  }
  return result;
}
