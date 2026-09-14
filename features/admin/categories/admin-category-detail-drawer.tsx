"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AdminCategoryIcon } from "@/features/admin/categories/admin-category-icon";
import type { AdminCategoryRow } from "@/lib/admin/categories-admin-mock";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-dashed border-neutral-200 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <div className="mt-1.5 text-sm text-neutral-800">{children}</div>
    </div>
  );
}

export function AdminCategoryDetailDrawer({
  category,
  open,
  onClose,
}: {
  category: AdminCategoryRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !category) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close category details"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2
              id="category-drawer-title"
              className="text-lg font-semibold text-neutral-800"
            >
              {category.name}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">/{category.slug}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <DetailRow label="Logo">
            <span className="inline-flex size-14 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700">
              <AdminCategoryIcon iconKey={category.iconKey} className="size-7" />
            </span>
          </DetailRow>

          <DetailRow label="Banner / cover image">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
                Banner
              </div>
              <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50 text-xs text-neutral-400">
                Cover
              </div>
            </div>
          </DetailRow>

          <DetailRow label="Products in the category">
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold tabular-nums">
                {category.productCount}
              </span>
              <Link
                href={`/admin/products?category=${encodeURIComponent(category.slug)}`}
                className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-[#3897f0] hover:bg-blue-100"
              >
                View products
              </Link>
            </div>
          </DetailRow>

          <DetailRow label="Parent category">
            {category.parentName ?? "—"}
          </DetailRow>
          <DetailRow label="Order level">{category.orderLevel}</DetailRow>
          <DetailRow label="Level">{category.level}</DetailRow>
          <DetailRow label="Subcategories">{category.childCount}</DetailRow>

          <DetailRow label="Category based discount">
            <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
              Not applied
            </span>
          </DetailRow>

          <DetailRow label="Filtering attributes">
            {category.filterKeys.length > 0
              ? category.filterKeys.join(", ")
              : "—"}
          </DetailRow>

          <DetailRow label="Featured">
            {category.featured ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Hot category">
            {category.hot ? "Yes" : "No"}
          </DetailRow>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          <Link
            href={`/admin/categories/${category.slug}`}
            className="inline-flex flex-1 items-center justify-center rounded-md bg-[#3897f0] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f86d8]"
          >
            Edit category
          </Link>
          <Link
            href={`/category/${category.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Storefront
          </Link>
        </div>
      </aside>
    </div>
  );
}
