"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  applyBulkCompatibility,
  clearProductBuilderSlot,
  isCompatibilitySlot,
  saveProductCompatibility,
  type CompatibilityMutationResult,
  type CompatibilityValues,
} from "@/lib/pc-builder/admin-compatibility";

const PAGE = "/admin/pc-builder/compatibility";
const FIELDS = [
  "socket",
  "ramType",
  "formFactor",
  "storageInterface",
  "tdpWatts",
] as const;

/** Keeps only known string fields — nothing else from the client reaches the writer. */
function cleanValues(input: unknown): CompatibilityValues {
  const out: CompatibilityValues = {};
  if (typeof input !== "object" || input === null) {
    return out;
  }
  for (const field of FIELDS) {
    const value = (input as Record<string, unknown>)[field];
    if (typeof value === "string") {
      out[field] = value;
    }
  }
  return out;
}

async function authorise(): Promise<
  | {
      ok: true;
      actor: { staffId: string; email: string; ip: string | null };
    }
  | { ok: false; formError: string }
> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("pc_builder.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip ?? null,
    },
  };
}

export async function saveProductCompatibilityAction(input: {
  productId: string;
  values: CompatibilityValues;
}): Promise<CompatibilityMutationResult> {
  const auth = await authorise();
  if (!auth.ok) {
    return auth;
  }
  if (typeof input?.productId !== "string" || !input.productId) {
    return { ok: false, formError: "Missing product." };
  }
  const result = await saveProductCompatibility({
    productId: input.productId,
    values: cleanValues(input.values),
    actor: auth.actor,
  });
  if (result.ok) {
    revalidatePath(PAGE);
  }
  return result;
}

export async function applyBulkCompatibilityAction(input: {
  slot: string;
  productIds: string[];
  values: CompatibilityValues;
  mode: "fill_empty" | "overwrite";
}): Promise<CompatibilityMutationResult> {
  const auth = await authorise();
  if (!auth.ok) {
    return auth;
  }
  if (typeof input?.slot !== "string" || !isCompatibilitySlot(input.slot)) {
    return { ok: false, formError: "Choose a valid slot." };
  }
  if (
    !Array.isArray(input.productIds) ||
    input.productIds.some((id) => typeof id !== "string")
  ) {
    return { ok: false, formError: "Select at least one product." };
  }
  const result = await applyBulkCompatibility({
    slot: input.slot,
    productIds: input.productIds,
    values: cleanValues(input.values),
    mode: input.mode === "overwrite" ? "overwrite" : "fill_empty",
    actor: auth.actor,
  });
  if (result.ok) {
    revalidatePath(PAGE);
  }
  return result;
}

export async function clearProductBuilderSlotAction(input: {
  productId: string;
}): Promise<CompatibilityMutationResult> {
  const auth = await authorise();
  if (!auth.ok) {
    return auth;
  }
  if (typeof input?.productId !== "string" || !input.productId) {
    return { ok: false, formError: "Missing product." };
  }
  const result = await clearProductBuilderSlot({
    productId: input.productId,
    actor: auth.actor,
  });
  if (result.ok) {
    revalidatePath(PAGE);
  }
  return result;
}
