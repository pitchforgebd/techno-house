"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveBlogCategoryAction,
  setBlogCategoryActiveAction,
} from "@/features/admin/blog/blog-actions";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type { BlogCategory } from "@/lib/admin/engagement-mock";
import { normalizeSlug } from "@/lib/content/slug";

export function AdminBlogCategoryList({
  categories,
}: {
  categories: BlogCategory[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleNameBlur() {
    if (!slug.trim() && name.trim()) {
      setSlug(normalizeSlug(name));
    }
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await saveBlogCategoryAction({ name, slug });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess("Category created");
      setName("");
      setSlug("");
      router.refresh();
    });
  }

  function handleToggle(category: BlogCategory, checked: boolean) {
    startTransition(async () => {
      const result = await setBlogCategoryActiveAction({
        id: category.id,
        isActive: checked,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        checked ? `${category.name} enabled` : `${category.name} disabled`,
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Blog categories
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Organize editorial posts for the storefront blog
          </p>
        </div>
        <Link
          href="/admin/blog"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          All posts
        </Link>
      </div>

      {formError ? (
        <Alert tone="danger" title="Could not save">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm"
        onSubmit={handleCreate}
      >
        <label className="min-w-[12rem] flex-1 space-y-1">
          <span className="text-caption font-medium text-text-muted">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            required
            maxLength={80}
          />
        </label>
        <label className="min-w-[12rem] flex-1 space-y-1">
          <span className="text-caption font-medium text-text-muted">Slug</span>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            maxLength={80}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-[#3897f0] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f86d8] disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden />
          Add category
        </button>
      </form>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="th-scroll-hide overflow-x-auto">
          <Table className="min-w-[40rem] text-caption">
            <TableHead>
              <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                <TableHeader className="text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Name
                </TableHeader>
                <TableHeader className="w-40 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Slug
                </TableHeader>
                <TableHeader className="w-24 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Posts
                </TableHeader>
                <TableHeader className="w-24 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow
                  key={category.id}
                  className="border-b border-dashed border-neutral-200"
                >
                  <TableCell className="font-medium text-neutral-900">
                    {category.name}
                  </TableCell>
                  <TableCell className="font-mono text-neutral-500">
                    {category.slug}
                  </TableCell>
                  <TableCell className="tabular-nums text-neutral-700">
                    {category.postCount}
                  </TableCell>
                  <TableCell>
                    <AdminToggleSwitch
                      label={`Status for ${category.name}`}
                      checked={category.status}
                      onChange={(checked) => handleToggle(category, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
