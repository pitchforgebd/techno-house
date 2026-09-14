"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { AdminMediaImageField } from "@/features/admin/media/admin-media-picker";
import { RichTextEditor } from "@/features/admin/marketing/rich-text-editor";
import { saveAdminCategoryAction } from "@/features/admin/categories/category-actions";
import type { AdminCategoryRow } from "@/lib/admin/categories-admin-mock";
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  slugifyCategory,
} from "@/lib/catalog/category-input";
import type { Category } from "@/lib/data/types/catalog";

type FormMode = "create" | "edit";

export function AdminCategoryForm({
  mode,
  category,
  seoContentHtml,
  categories,
  canSave,
}: {
  mode: FormMode;
  category?: AdminCategoryRow | null;
  /** Sanitized buying-guide HTML, loaded separately from the category row. */
  seoContentHtml?: string;
  categories: Category[];
  canSave: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [parentSlug, setParentSlug] = useState(category?.parentSlug ?? "");
  const [orderLevel, setOrderLevel] = useState(
    category ? String(category.orderLevel) : "0",
  );
  const [metaTitle, setMetaTitle] = useState(category?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    category?.metaDescription ?? "",
  );
  const [metaKeywords, setMetaKeywords] = useState(
    category?.filterKeys.join(", ") ?? "",
  );
  const [filterAttr, setFilterAttr] = useState(category?.filterKeys[0] ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [bannerSrc, setBannerSrc] = useState(category?.bannerSrc ?? "");
  const [iconSrc, setIconSrc] = useState(category?.iconSrc ?? "");
  const [coverSrc, setCoverSrc] = useState(category?.coverSrc ?? "");
  const [pageContent, setPageContent] = useState(seoContentHtml ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parentOptions = categories.filter(
    (item) => mode === "create" || item.slug !== category?.slug,
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!canSave) {
      setError("You do not have permission to save categories.");
      return;
    }

    startTransition(async () => {
      const result = await saveAdminCategoryAction({
        currentSlug: mode === "edit" ? category?.slug : undefined,
        fields: {
          name,
          slug,
          parentSlug,
          position: orderLevel,
          description: metaDescription,
          filterKeywords: metaKeywords,
          filterAttr,
          isActive,
          bannerSrc,
          iconSrc,
          coverSrc,
          seoContentHtml: pageContent,
        },
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the category.");
        return;
      }
      notifySuccess(mode === "create" ? "Category created" : "Category saved");
      router.refresh();
      if (mode === "create" || result.slug !== category?.slug) {
        router.push(`/admin/categories/${result.slug}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/categories" className="hover:underline">
            Categories
          </Link>
          <span className="text-text-muted">
            {" "}
            / {mode === "create" ? "New" : "Edit"}
          </span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
          {mode === "create" ? "Add new category" : "Edit category"}
        </h1>
        {mode === "edit" && category ? (
          <p className="mt-1 text-body text-text-muted">{category.name}</p>
        ) : null}
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Category information">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="category-name" required>
            Name
          </AdminFormLabel>
          <Input
            id="category-name"
            placeholder="Name"
            value={name}
            maxLength={CATEGORY_NAME_MAX}
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (mode === "create") {
                setSlug(slugifyCategory(next));
              }
              if (!metaTitle || metaTitle === `${name} | Techno House`) {
                setMetaTitle(next ? `${next} | Techno House` : "");
              }
            }}
            className={adminFormControlClass}
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="category-slug" required>
            URL slug
          </AdminFormLabel>
          <Input
            id="category-slug"
            value={slug}
            onChange={(event) => setSlug(slugifyCategory(event.target.value))}
            className={adminFormControlClass}
            required
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Storefront path: /category/{slug || "…"}
          </p>
        </div>

        <div className="space-y-2">
          <AdminFormLabel>Type</AdminFormLabel>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-md border-2 border-[#3897f0] bg-blue-50/40 px-4 py-3">
              <input
                type="radio"
                name="category-type"
                defaultChecked
                className="accent-[#3897f0]"
              />
              <span className="text-sm font-medium text-neutral-800">
                Physical
              </span>
            </label>
            <label className="flex cursor-not-allowed items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 opacity-60">
              <input
                type="radio"
                name="category-type"
                disabled
                className="accent-[#3897f0]"
              />
              <span className="text-sm font-medium text-neutral-500">
                Digital
              </span>
            </label>
          </div>
          <p className="text-xs text-neutral-500">
            Techno House catalogs physical products only.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="parent-category">
            Parent category
          </AdminFormLabel>
          <Select
            id="parent-category"
            value={parentSlug}
            onChange={(event) => setParentSlug(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          >
            <option value="">No parent</option>
            {parentOptions.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="order-level">Ordering number</AdminFormLabel>
          <Input
            id="order-level"
            inputMode="numeric"
            placeholder="Order level"
            value={orderLevel}
            onChange={(event) => setOrderLevel(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Lower number appears first on the storefront.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-4 rounded border-border accent-[#3897f0]"
            disabled={pending}
          />
          Visible on the storefront
        </label>

        <AdminMediaImageField
          label="Banner"
          value={bannerSrc}
          onChange={setBannerSrc}
          disabled={pending || !canSave}
          folder="categories"
          pickerTitle="Category banner"
          hint="Opens the media library — upload from your PC or choose an existing file."
        />
        <AdminMediaImageField
          label="Icon"
          value={iconSrc}
          onChange={setIconSrc}
          disabled={pending || !canSave}
          folder="categories"
          pickerTitle="Category icon"
          hint="Used in admin lists and navigation where category icons appear."
        />
        <AdminMediaImageField
          label="Cover image"
          value={coverSrc}
          onChange={setCoverSrc}
          disabled={pending || !canSave}
          folder="categories"
          pickerTitle="Category cover"
          hint="Optional wide cover for category landing layouts."
        />

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="meta-title">Meta title</AdminFormLabel>
          <Input
            id="meta-title"
            placeholder="Meta title"
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Not stored on the category record yet.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="meta-description">
            Description
          </AdminFormLabel>
          <Textarea
            id="meta-description"
            rows={4}
            maxLength={CATEGORY_DESCRIPTION_MAX}
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">
            Stored as the category description.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel>Category page description</AdminFormLabel>
          <RichTextEditor
            value={pageContent}
            onChange={setPageContent}
            disabled={pending || !canSave}
            placeholder="Buying guide shown at the bottom of the category page — headings, links, tables, or pasted formatted text."
          />
          <p className="text-xs text-neutral-500">
            Rendered at the bottom of /category/{slug || "…"}. Leave empty to
            keep the built-in copy for this category.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="meta-keywords">Filter keys</AdminFormLabel>
          <Input
            id="meta-keywords"
            placeholder="processor, ram, storage"
            value={metaKeywords}
            onChange={(event) => setMetaKeywords(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          />
          <p className="text-xs text-neutral-500">Separate with comma</p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="filter-attrs">
            Add filtering attribute
          </AdminFormLabel>
          <Select
            id="filter-attrs"
            value={filterAttr}
            onChange={(event) => setFilterAttr(event.target.value)}
            className={adminFormControlClass}
            disabled={pending}
          >
            <option value="">Nothing selected</option>
            <option value="processor">Processor</option>
            <option value="ram">RAM</option>
            <option value="storage">Storage</option>
            <option value="graphics">Graphics</option>
            <option value="size">Size</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/categories"
            className={buttonClassName({
              variant: "ghost",
              className: "border border-neutral-200",
            })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
            disabled={pending || !canSave}
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </AdminFormCard>
    </form>
  );
}
