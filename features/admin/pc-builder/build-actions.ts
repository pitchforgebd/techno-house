"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  setPcBuildFeatured,
  type PcBuildMutationResult,
} from "@/lib/pc-builder/admin-builds";

async function guardOrigin(): Promise<PcBuildMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function setPcBuildFeaturedAction(input: {
  id: string;
  featured: boolean;
}): Promise<PcBuildMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("pc_builder.builds");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setPcBuildFeatured({
    id: input.id,
    featured: input.featured,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/pc-builder/builds");
    revalidatePath("/", "layout");
  }
  return result;
}
