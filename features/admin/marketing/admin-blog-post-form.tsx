"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  saveBlogPostAction,
  updateBlogCoverAltAction,
  uploadBlogCoverImageAction,
} from "@/features/admin/blog/blog-actions";
import { RichTextEditor } from "@/features/admin/marketing/rich-text-editor";
import type { BlogCategory, BlogPost } from "@/lib/admin/engagement-mock";
import { normalizeSlug } from "@/lib/content/slug";
import { cn } from "@/lib/cn";

const SEO_TITLE_MIN = 30;
const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MIN = 70;
const SEO_DESCRIPTION_MAX = 160;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

function countWords(html: string): number {
  const trimmed = stripHtml(html).trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function lengthTone(length: number, min: number, max: number): string {
  if (length === 0) return "text-neutral-400";
  if (length > max) return "text-red-600";
  if (length < min) return "text-amber-600";
  return "text-emerald-600";
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-md border border-border bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdminBlogPostForm({
  post,
  categories,
  isNew,
  siteOrigin,
}: {
  post: BlogPost | null;
  categories: BlogCategory[];
  isNew?: boolean;
  siteOrigin: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [categoryId, setCategoryId] = useState(post?.categoryId ?? "");
  const [status, setStatus] = useState<BlogPost["status"]>(
    post?.status ?? "draft",
  );
  const [publishedAt, setPublishedAt] = useState(post?.publishedAt ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    post?.seoDescription ?? "",
  );
  const [coverMediaId, setCoverMediaId] = useState(post?.coverMediaId ?? "");
  const [coverPreview, setCoverPreview] = useState(post?.coverImagePath ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.coverImageAlt ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setUploadingCover(true);
    const formData = new FormData();
    formData.set("image", file);
    const result = await uploadBlogCoverImageAction(formData);
    setUploadingCover(false);
    if (!result.ok) {
      notifyError(result.formError);
      return;
    }
    setCoverMediaId(result.mediaId);
    setCoverPreview(result.path);
    setCoverAlt("");
  }

  function handleCoverAltBlur() {
    if (!coverMediaId) {
      return;
    }
    startTransition(async () => {
      const result = await updateBlogCoverAltAction({
        mediaId: coverMediaId,
        alt: coverAlt,
      });
      if (!result.ok) {
        notifyError(result.formError);
      }
    });
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (isNew && !slugTouched) {
      setSlug(normalizeSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value);
    setSlugTouched(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!stripHtml(body).trim()) {
      setFormError("Enter the post body.");
      return;
    }
    startTransition(async () => {
      const result = await saveBlogPostAction({
        id: isNew ? undefined : post?.id,
        title,
        slug,
        excerpt,
        body,
        categoryId,
        status,
        publishedAt,
        seoTitle,
        seoDescription,
        coverMediaId: coverMediaId || null,
      });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess(isNew ? "Post created" : "Post saved");
      router.refresh();
      if (isNew) {
        router.push(`/admin/blog/${result.id}`);
      }
    });
  }

  const wordCount = countWords(body);
  const readingMinutes = Math.max(1, Math.round(wordCount / 200));
  const effectiveSlug = normalizeSlug(slug) || "your-post-slug";
  const effectiveSeoTitle =
    seoTitle.trim() ||
    (title.trim() ? `${title.trim()} — Techno House` : "Your post title — Techno House");
  const effectiveSeoDescription =
    seoDescription.trim() ||
    excerpt.trim() ||
    "Add a summary or SEO description to control what shows here.";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/blog" className="hover:underline">
            Blog
          </Link>
          <span className="text-text-muted"> / </span>
          {isNew ? "New post" : post?.title}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
          {isNew ? "Create post" : post?.title}
        </h1>
      </div>

      {formError ? (
        <Alert tone="danger" title="Could not save">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Section title="Content">
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Title
            </span>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              maxLength={160}
              disabled={pending}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">Slug</span>
            <span className="block text-xs text-text-muted">
              {isNew && !slugTouched
                ? "Auto-generated from the title. Edit it directly to set a custom URL."
                : "The post's real URL — changing this after publishing will break existing links to it."}
            </span>
            <Input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              maxLength={80}
              disabled={pending}
            />
            <p className="truncate text-xs text-text-muted">
              {siteOrigin}/blog/{effectiveSlug}
            </p>
          </label>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Summary
            </span>
            <span className="block text-xs text-text-muted">
              Shown under the title on the blog list and post page. Also used
              as the SEO description when one isn&apos;t set below.
            </span>
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={400}
              rows={3}
              disabled={pending}
            />
          </label>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-text-muted">
                Body
              </span>
              <span className="text-xs text-text-muted">
                {wordCount} words · ~{readingMinutes} min read
              </span>
            </div>
            <RichTextEditor value={body} onChange={setBody} disabled={pending} />
          </div>
        </Section>

        <Section
          title="Cover image"
          description="Shown on the blog list, the post page, and used as the social share (Open Graph) image."
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview}
              alt=""
              className="h-40 w-full max-w-sm rounded-md border border-neutral-200 object-cover"
            />
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            disabled={uploadingCover || pending}
            className="block text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {uploadingCover ? (
            <p className="text-xs text-neutral-400">Uploading…</p>
          ) : null}
          {coverPreview ? (
            <label className="block space-y-1 pt-2">
              <span className="text-caption font-medium text-text-muted">
                Alt text
              </span>
              <span className="block text-xs text-text-muted">
                Describes the image for screen readers and image search —
                real accessibility and SEO value, not decorative.
              </span>
              <Input
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
                onBlur={handleCoverAltBlur}
                placeholder="e.g. A gaming laptop on a desk with RGB lighting"
                maxLength={200}
                disabled={pending}
              />
            </label>
          ) : null}
        </Section>

        <Section title="Organize">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-caption font-medium text-text-muted">
                Category
              </span>
              <Select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={pending}
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block space-y-1">
              <span className="text-caption font-medium text-text-muted">
                Status
              </span>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as BlogPost["status"])}
                disabled={pending}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </Select>
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-caption font-medium text-text-muted">
              Published date
            </span>
            <Input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={pending}
            />
          </label>
        </Section>

        <Section
          title="SEO & sharing"
          description="Controls the search-result snippet and social share preview. Leave blank to fall back to the title and summary above."
        >
          <label className="block space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-text-muted">
                SEO title
              </span>
              <span className={cn("text-xs tabular-nums", lengthTone(seoTitle.length, SEO_TITLE_MIN, SEO_TITLE_MAX))}>
                {seoTitle.length}/{SEO_TITLE_MAX}
              </span>
            </div>
            <Input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              maxLength={160}
              placeholder={title || "Falls back to the post title"}
              disabled={pending}
            />
          </label>
          <label className="block space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium text-text-muted">
                SEO description
              </span>
              <span className={cn("text-xs tabular-nums", lengthTone(seoDescription.length, SEO_DESCRIPTION_MIN, SEO_DESCRIPTION_MAX))}>
                {seoDescription.length}/{SEO_DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              maxLength={320}
              rows={3}
              placeholder={excerpt || "Falls back to the summary"}
              disabled={pending}
            />
          </label>

          <div>
            <p className="mb-1.5 text-xs font-medium text-text-muted">
              Search result preview
            </p>
            <div className="rounded-md border border-neutral-200 bg-white p-3">
              <p className="truncate text-xs text-emerald-700">
                {siteOrigin}/blog/{effectiveSlug}
              </p>
              <p className="truncate text-lg text-blue-700">
                {effectiveSeoTitle}
              </p>
              <p className="line-clamp-2 text-sm text-neutral-600">
                {effectiveSeoDescription}
              </p>
            </div>
          </div>

          {coverPreview ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-muted">
                Social share preview
              </p>
              <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPreview}
                  alt=""
                  className="h-32 w-full object-cover"
                />
                <div className="p-2.5">
                  <p className="truncate text-xs uppercase text-neutral-400">
                    {siteOrigin.replace(/^https?:\/\//, "")}
                  </p>
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {title || "Your post title"}
                  </p>
                  <p className="line-clamp-1 text-xs text-neutral-500">
                    {effectiveSeoDescription}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </Section>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save post"}
          </Button>
          <Link
            href="/admin/blog"
            className={buttonClassName({ variant: "secondary" })}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
