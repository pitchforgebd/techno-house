"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  deleteLabel,
  deleteNote,
  deleteUnit,
  deleteWarranty,
  saveLabel,
  saveNote,
  saveUnit,
  saveWarranty,
  setLabelActive,
  type PresetActor,
  type PresetMutationResult,
} from "@/lib/catalog/admin-presets";
import { runBulkAction, type BulkActionResult } from "@/lib/admin/bulk-actions";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

type GuardResult =
  | { ok: true; actor: PresetActor }
  | { ok: false; formError: string };

/**
 * These catalogues feed the product form, so they are gated on the same
 * `product.edit` permission that governs editing a product.
 */
async function guard(): Promise<GuardResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("product.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  };
}

/** Preset changes affect the product form and storefront badges. */
function revalidatePresets(path: string) {
  revalidatePath(path);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

export async function saveUnitAction(input: {
  id?: string;
  name: string;
}): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await saveUnit({ ...input, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/units");
  return result;
}

export async function deleteUnitAction(id: string): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await deleteUnit({ id, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/units");
  return result;
}

export async function bulkDeleteUnitsAction(
  ids: string[],
): Promise<BulkActionResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await runBulkAction(ids, (id) =>
    deleteUnit({ id, actor: gate.actor }),
  );
  if (result.ok) revalidatePresets("/admin/units");
  return result;
}

export async function saveNoteAction(input: {
  id?: string;
  type: string;
  description: string;
}): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await saveNote({ ...input, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/notes");
  return result;
}

export async function deleteNoteAction(id: string): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await deleteNote({ id, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/notes");
  return result;
}

export async function bulkDeleteNotesAction(
  ids: string[],
): Promise<BulkActionResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await runBulkAction(ids, (id) =>
    deleteNote({ id, actor: gate.actor }),
  );
  if (result.ok) revalidatePresets("/admin/notes");
  return result;
}

export async function saveLabelAction(input: {
  id?: string;
  text: string;
  backgroundColor: string;
  textTone: string;
  isActive?: boolean;
  productIds?: string[];
}): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await saveLabel({ ...input, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/labels");
  return result;
}

export async function setLabelActiveAction(
  id: string,
  isActive: boolean,
): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await setLabelActive({ id, isActive, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/labels");
  return result;
}

export async function deleteLabelAction(id: string): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await deleteLabel({ id, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/labels");
  return result;
}

export async function bulkSetLabelsActiveAction(
  ids: string[],
  isActive: boolean,
): Promise<BulkActionResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await runBulkAction(ids, (id) =>
    setLabelActive({ id, isActive, actor: gate.actor }),
  );
  if (result.ok) revalidatePresets("/admin/labels");
  return result;
}

export async function bulkDeleteLabelsAction(
  ids: string[],
): Promise<BulkActionResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await runBulkAction(ids, (id) =>
    deleteLabel({ id, actor: gate.actor }),
  );
  if (result.ok) revalidatePresets("/admin/labels");
  return result;
}

export async function saveWarrantyAction(input: {
  id?: string;
  text: string;
  logoSrc?: string | null;
}): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await saveWarranty({ ...input, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/warranty");
  return result;
}

export async function uploadWarrantyLogoAction(
  formData: FormData,
): Promise<{ ok: true; path: string } | { ok: false; formError: string }> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose a logo image file." };
  }
  const uploaded = await uploadAdminMediaFiles({
    files: [file],
    // Same folder the refund sticker upload uses for this size of badge image
    // — no dedicated "warranty" folder in MediaFolder for one small logo.
    folder: "general",
    actor: gate.actor,
  });
  if (!uploaded.ok) {
    return uploaded;
  }
  if (!uploaded.path) {
    return { ok: false, formError: "Upload saved but path could not be read." };
  }
  return { ok: true, path: uploaded.path };
}

export async function deleteWarrantyAction(
  id: string,
): Promise<PresetMutationResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await deleteWarranty({ id, actor: gate.actor });
  if (result.ok) revalidatePresets("/admin/warranty");
  return result;
}

export async function bulkDeleteWarrantiesAction(
  ids: string[],
): Promise<BulkActionResult> {
  const gate = await guard();
  if (!gate.ok) return gate;
  const result = await runBulkAction(ids, (id) =>
    deleteWarranty({ id, actor: gate.actor }),
  );
  if (result.ok) revalidatePresets("/admin/warranty");
  return result;
}
