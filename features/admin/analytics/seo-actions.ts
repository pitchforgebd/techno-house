"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { saveGlobalSeo, type SeoMutationResult } from "@/lib/seo/config";
import { saveHomeSeoHtml, type HomeSeoResult } from "@/lib/seo/home-content";
import { revalidatePath } from "next/cache";

function revalidateSeo() {
  revalidatePath("/admin/seo");
  revalidatePath("/admin/sitemap");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
}

export async function saveGlobalSeoAction(input: {
  title: string;
  description: string;
  keywords: string;
}): Promise<SeoMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("seo.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveGlobalSeo({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateSeo();
  }
  return result;
}

export async function saveHomeSeoContentAction(input: {
  html: string;
}): Promise<HomeSeoResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("seo.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveHomeSeoHtml({
    html: input.html,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateSeo();
  }
  return result;
}

export async function refreshSitemapAction(): Promise<SeoMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("sitemap.manage");
  if (!allowed.ok) {
    return allowed;
  }
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
  revalidatePath("/admin/sitemap");
  return { ok: true, id: "sitemap" };
}
