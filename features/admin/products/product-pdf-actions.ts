"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";

const MAX_BYTES = 8 * 1024 * 1024;
const PDF_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "products",
  "pdfs",
);

export type ProductPdfUploadResult =
  | { ok: true; path: string }
  | { ok: false; formError: string };

/**
 * Staff-only PDF upload for product specification sheets.
 * Files land under `/uploads/products/pdfs/…` (public).
 */
export async function uploadProductPdfAction(
  formData: FormData,
): Promise<ProductPdfUploadResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }

  const edit = await staffWithPermission("product.edit");
  const add = edit.ok ? null : await staffWithPermission("product.add");
  const session = edit.ok ? edit.session : add?.ok ? add.session : null;
  if (!session) {
    return {
      ok: false,
      formError: edit.ok
        ? "Not allowed."
        : (add && !add.ok ? add.formError : "Not allowed."),
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose a PDF file to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, formError: "PDF must be 8 MB or smaller." };
  }

  const original = file.name.trim() || "specification.pdf";
  const ext = path.extname(original).toLowerCase();
  const mime = file.type.toLowerCase();
  if (ext !== ".pdf" && mime !== "application/pdf") {
    return { ok: false, formError: "Only PDF files are allowed." };
  }

  const safeBase = original
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const withExt =
    safeBase.toLowerCase().endsWith(".pdf")
      ? safeBase
      : `${safeBase || "specification"}.pdf`;
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}-${withExt}`;

  await mkdir(PDF_DIR, { recursive: true });
  const absolute = path.join(PDF_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolute, buffer);

  const publicPath = `/uploads/products/pdfs/${filename}`;
  const meta = await getRequestMeta();
  await writeAuditLog({
    actorType: "STAFF",
    actorId: session.staffId,
    actorLabel: session.email,
    action: AUDIT_ACTIONS.PRODUCT_UPDATE,
    entityType: "ProductPdf",
    entityId: filename,
    ip: meta.ip,
    metadata: { path: publicPath, size: file.size },
  });

  return { ok: true, path: publicPath };
}
