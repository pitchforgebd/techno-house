/**
 * Blog categories and posts (P15-T04).
 *
 * Rows live on `BlogCategory` and `BlogPost`. The storefront lists
 * PUBLISHED posts only. Cover media and staff author assignment stay
 * optional. Guests and `DATA_SOURCE=mock` keep `MOCK_BLOG_*`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  MOCK_BLOG_CATEGORIES,
  MOCK_BLOG_POSTS,
  type BlogCategory,
  type BlogPost,
} from "@/lib/admin/engagement-mock";
import { normalizeSlug } from "@/lib/content/slug";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";
import { getPrisma } from "@/lib/db/prisma";
import type { PublishStatus as DbPublishStatus } from "@/lib/generated/prisma/enums";

export { normalizeSlug } from "@/lib/content/slug";

export const BLOG_DB_REQUIRED =
  "Blog changes need the database. Turn off DATA_SOURCE=mock to save.";

export type BlogMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type BlogActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type PublicBlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string | null;
  publishedAt: string | null;
  seoTitle: string;
  seoDescription: string;
  coverImagePath: string | null;
  coverImageAlt: string | null;
};

const STATUS_TO_DB = {
  draft: "DRAFT",
  scheduled: "SCHEDULED",
  published: "PUBLISHED",
} as const satisfies Record<BlogPost["status"], DbPublishStatus>;

const STATUS_FROM_DB: Record<DbPublishStatus, BlogPost["status"]> = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): BlogMutationResult {
  return { ok: false, formError };
}

function dateLabel(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function parseDateInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toAdminPost(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: DbPublishStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  category: { id: string; name: string } | null;
  authorStaff: { fullName: string } | null;
  coverMediaId?: string | null;
  coverMedia?: { path: string; alt: string | null } | null;
}): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category?.name ?? "Uncategorized",
    categoryId: row.category?.id ?? null,
    excerpt: row.excerpt ?? "",
    body: row.body,
    status: STATUS_FROM_DB[row.status],
    author: row.authorStaff?.fullName || "Techno House",
    publishedAt: dateLabel(row.publishedAt),
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    coverImagePath: row.coverMedia?.path ?? null,
    coverImageAlt: row.coverMedia?.alt ?? null,
    coverMediaId: row.coverMediaId ?? null,
  };
}

function toAdminCategory(row: {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  _count: { posts: number };
}): BlogCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    postCount: row._count.posts,
    status: row.isActive,
  };
}

function toPublicPost(post: BlogPost): PublicBlogPost {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    category: post.category === "Uncategorized" ? null : post.category,
    publishedAt: post.publishedAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    coverImagePath: post.coverImagePath ?? null,
    coverImageAlt: post.coverImageAlt ?? null,
  };
}

const postInclude = {
  category: { select: { id: true, name: true } },
  authorStaff: { select: { fullName: true } },
  coverMedia: { select: { path: true, alt: true } },
} as const;

async function audit(
  action: string,
  entityType: string,
  entityId: string,
  actor: BlogActor | undefined,
  metadata: Record<string, unknown>,
) {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType,
    entityId,
    metadata,
    ip: actor.ip,
  });
}

export async function listAdminPosts(): Promise<BlogPost[]> {
  if (!usesDatabase()) {
    return [...MOCK_BLOG_POSTS];
  }
  const rows = await getPrisma().blogPost.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: postInclude,
  });
  return rows.map(toAdminPost);
}

export async function getAdminPost(id: string): Promise<BlogPost | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  if (!usesDatabase()) {
    return MOCK_BLOG_POSTS.find((item) => item.id === trimmed) ?? null;
  }
  const row = await getPrisma().blogPost.findUnique({
    where: { id: trimmed },
    include: postInclude,
  });
  return row ? toAdminPost(row) : null;
}

export async function listAdminCategories(): Promise<BlogCategory[]> {
  if (!usesDatabase()) {
    return [...MOCK_BLOG_CATEGORIES];
  }
  const rows = await getPrisma().blogCategory.findMany({
    orderBy: [{ name: "asc" }],
    include: { _count: { select: { posts: true } } },
  });
  return rows.map(toAdminCategory);
}

export async function listPublicPosts(): Promise<PublicBlogPost[]> {
  if (!usesDatabase()) {
    return MOCK_BLOG_POSTS.filter((post) => post.status === "published").map(
      toPublicPost,
    );
  }
  const rows = await getPrisma().blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: postInclude,
  });
  return rows.map((row) => toPublicPost(toAdminPost(row)));
}

export async function getPublicPost(
  slug: string,
): Promise<PublicBlogPost | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return null;
  }
  if (!usesDatabase()) {
    const mock = MOCK_BLOG_POSTS.find(
      (post) => post.slug === normalized && post.status === "published",
    );
    return mock ? toPublicPost(mock) : null;
  }
  const row = await getPrisma().blogPost.findFirst({
    where: { slug: normalized, status: "PUBLISHED" },
    include: postInclude,
  });
  return row ? toPublicPost(toAdminPost(row)) : null;
}

export async function saveCategory(input: {
  id?: string;
  name: string;
  slug: string;
  actor?: BlogActor;
}): Promise<BlogMutationResult> {
  if (!usesDatabase()) {
    return fail(BLOG_DB_REQUIRED);
  }

  const name = input.name.trim().slice(0, 80);
  if (!name) {
    return fail("Enter a category name.");
  }
  const slug = normalizeSlug(input.slug || name);
  if (!slug) {
    return fail("Enter a valid category slug.");
  }

  const existingId = input.id?.trim() ?? "";
  const slugTaken = await getPrisma().blogCategory.findFirst({
    where: {
      slug,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
    select: { id: true },
  });
  if (slugTaken) {
    return fail("That category slug is already in use.");
  }

  if (existingId) {
    const existing = await getPrisma().blogCategory.findUnique({
      where: { id: existingId },
      select: { id: true, slug: true },
    });
    if (!existing) {
      return fail("That category no longer exists.");
    }
    await getPrisma().blogCategory.update({
      where: { id: existing.id },
      data: { name, slug },
    });
    await audit(
      AUDIT_ACTIONS.BLOG_CATEGORY_UPDATE,
      "BlogCategory",
      existing.id,
      input.actor,
      { slug },
    );
    return { ok: true, id: existing.id };
  }

  const created = await getPrisma().blogCategory.create({
    data: { name, slug, isActive: true },
    select: { id: true },
  });
  await audit(
    AUDIT_ACTIONS.BLOG_CATEGORY_CREATE,
    "BlogCategory",
    created.id,
    input.actor,
    { slug },
  );
  return { ok: true, id: created.id };
}

export async function setCategoryActive(input: {
  id: string;
  isActive: boolean;
  actor?: BlogActor;
}): Promise<BlogMutationResult> {
  if (!usesDatabase()) {
    return fail(BLOG_DB_REQUIRED);
  }
  const id = input.id.trim();
  if (!id) {
    return fail("Choose a category.");
  }
  const existing = await getPrisma().blogCategory.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return fail("That category no longer exists.");
  }
  await getPrisma().blogCategory.update({
    where: { id },
    data: { isActive: input.isActive },
  });
  await audit(
    AUDIT_ACTIONS.BLOG_CATEGORY_UPDATE,
    "BlogCategory",
    existing.id,
    input.actor,
    { slug: existing.slug, isActive: input.isActive },
  );
  return { ok: true, id };
}

export async function savePost(input: {
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
  actor?: BlogActor;
}): Promise<BlogMutationResult> {
  if (!usesDatabase()) {
    return fail(BLOG_DB_REQUIRED);
  }

  const title = input.title.trim().slice(0, 160);
  if (!title) {
    return fail("Enter a post title.");
  }
  const slug = normalizeSlug(input.slug || title);
  if (!slug) {
    return fail("Enter a valid post slug.");
  }
  const excerpt = input.excerpt.trim().slice(0, 400);
  const body = sanitizeBlogBody(input.body.trim().slice(0, 20000));
  if (!body) {
    return fail("Enter the post body.");
  }
  if (!(input.status in STATUS_TO_DB)) {
    return fail("Choose a valid status.");
  }
  const status = input.status as BlogPost["status"];
  const seoTitle = input.seoTitle.trim().slice(0, 160);
  const seoDescription = input.seoDescription.trim().slice(0, 320);

  const categoryId: string | null = input.categoryId.trim() || null;
  if (categoryId) {
    const category = await getPrisma().blogCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      return fail("Choose a valid category.");
    }
  }

  const publishedAt = parseDateInput(input.publishedAt);
  if (input.publishedAt.trim() && !publishedAt) {
    return fail("Enter a valid published date.");
  }
  if (status === "scheduled" && !publishedAt) {
    return fail("Scheduled posts need a published date.");
  }

  const existingId = input.id?.trim() ?? "";
  const slugTaken = await getPrisma().blogPost.findFirst({
    where: {
      slug,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
    select: { id: true },
  });
  if (slugTaken) {
    return fail("That post slug is already in use.");
  }

  let nextPublishedAt = publishedAt;
  if (status === "published" && !nextPublishedAt) {
    if (existingId) {
      const current = await getPrisma().blogPost.findUnique({
        where: { id: existingId },
        select: { publishedAt: true },
      });
      nextPublishedAt = current?.publishedAt ?? new Date();
    } else {
      nextPublishedAt = new Date();
    }
  }

  const data = {
    title,
    slug,
    excerpt: excerpt || null,
    body,
    categoryId,
    status: STATUS_TO_DB[status],
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
    publishedAt: nextPublishedAt,
    coverMediaId: input.coverMediaId?.trim() || null,
  };

  if (existingId) {
    const existing = await getPrisma().blogPost.findUnique({
      where: { id: existingId },
      select: { id: true, slug: true },
    });
    if (!existing) {
      return fail("That post no longer exists.");
    }
    await getPrisma().blogPost.update({
      where: { id: existing.id },
      data,
    });
    await audit(
      AUDIT_ACTIONS.BLOG_UPDATE,
      "BlogPost",
      existing.id,
      input.actor,
      {
        slug,
        status,
      },
    );
    return { ok: true, id: existing.id };
  }

  const created = await getPrisma().blogPost.create({
    data,
    select: { id: true },
  });
  await audit(AUDIT_ACTIONS.BLOG_CREATE, "BlogPost", created.id, input.actor, {
    slug,
    status,
  });
  return { ok: true, id: created.id };
}
