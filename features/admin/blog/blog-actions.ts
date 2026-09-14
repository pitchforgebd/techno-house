"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveCategory,
  savePost,
  setCategoryActive,
  type BlogMutationResult,
} from "@/lib/content/blog";
import { updateAdminMediaAlt, uploadAdminMediaFiles } from "@/lib/media/admin-media";
import { revalidatePath } from "next/cache";

async function guardOrigin(): Promise<BlogMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

function revalidateBlog(id?: string) {
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/marketing");
  revalidatePath("/blog");
  if (id) {
    revalidatePath(`/admin/blog/${id}`);
  }
}

export async function saveBlogCategoryAction(input: {
  id?: string;
  name: string;
  slug: string;
}): Promise<BlogMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.id?.trim() ? "blog.edit" : "blog.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveCategory({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateBlog();
  }
  return result;
}

export async function setBlogCategoryActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<BlogMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("blog.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setCategoryActive({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateBlog();
  }
  return result;
}

export type UploadCoverResult =
  | { ok: true; mediaId: string; path: string }
  | { ok: false; formError: string };

export async function uploadBlogCoverImageAction(
  formData: FormData,
): Promise<UploadCoverResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("blog.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) {
    return { ok: false, formError: "Choose an image file." };
  }
  const result = await uploadAdminMediaFiles({
    files: [file],
    folder: "general",
    actor: { staffId: allowed.session.staffId, email: allowed.session.email },
  });
  if (!result.ok || !result.path) {
    return result.ok
      ? { ok: false, formError: "Upload succeeded but no path was returned." }
      : result;
  }
  return { ok: true, mediaId: result.id, path: result.path };
}

export async function updateBlogCoverAltAction(input: {
  mediaId: string;
  alt: string;
}): Promise<BlogMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("blog.edit");
  if (!allowed.ok) {
    return allowed;
  }
  return updateAdminMediaAlt({
    id: input.mediaId,
    alt: input.alt,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email },
  });
}

export async function saveBlogPostAction(input: {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  categoryId: string;
  status: string;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  coverMediaId?: string | null;
}): Promise<BlogMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.id?.trim() ? "blog.edit" : "blog.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await savePost({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateBlog(result.id);
    revalidatePath(`/blog/${input.slug}`);
  }
  return result;
}
