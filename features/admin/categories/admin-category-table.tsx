"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AdminCategoryDetailDrawer } from "@/features/admin/categories/admin-category-detail-drawer";
import { AdminCategoryIcon } from "@/features/admin/categories/admin-category-icon";
import { AdminCategoryRowActions } from "@/features/admin/categories/admin-category-row-actions";
import {
  setCategoryFeaturedAction,
  setCategoryHotAction,
} from "@/features/admin/categories/category-actions";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type { AdminCategoryRow } from "@/lib/admin/categories-admin-mock";

type Flags = { featured: boolean; hot: boolean };

export function AdminCategoryTable({
  items,
  canDelete,
  selected,
  onSelectedChange,
}: {
  items: AdminCategoryRow[];
  canDelete: boolean;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const initialFlags = useMemo(() => {
    const map = new Map<string, Flags>();
    for (const row of items) {
      map.set(row.slug, { featured: row.featured, hot: row.hot });
    }
    return map;
  }, [items]);

  const [flags, setFlags] = useState(initialFlags);
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const drawerCategory = items.find((item) => item.slug === drawerSlug) ?? null;
  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleSelectAll() {
    if (allSelected) {
      onSelectedChange(new Set());
      return;
    }
    onSelectedChange(new Set(items.map((item) => item.slug)));
  }

  function toggleSelect(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    onSelectedChange(next);
  }

  function setLocalFlag(slug: string, key: keyof Flags, value: boolean) {
    setFlags((current) => {
      const next = new Map(current);
      const row = next.get(slug);
      if (row) {
        next.set(slug, { ...row, [key]: value });
      }
      return next;
    });
  }

  function updateFlag(slug: string, key: keyof Flags, value: boolean) {
    setLocalFlag(slug, key, value);
    const label = key === "featured" ? "Featured" : "Hot category";
    startTransition(async () => {
      const result =
        key === "featured"
          ? await setCategoryFeaturedAction(slug, value)
          : await setCategoryHotAction(slug, value);
      if (!result.ok) {
        // Roll back — the toggle did not actually persist.
        setLocalFlag(slug, key, !value);
        notifyError(result.formError);
        return;
      }
      notifySuccess(`${label} updated`);
    });
  }

  return (
    <>
      <div className="th-scroll-hide overflow-x-auto">
        <Table className="min-w-[64rem] text-caption">
          <TableHead>
            <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
              <TableHeader className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all categories"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="size-4 rounded border-border"
                />
              </TableHeader>
              <TableHeader className="w-14 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Icon
              </TableHeader>
              <TableHeader className="min-w-[12rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Name
              </TableHeader>
              <TableHeader className="min-w-[9rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Parent category
              </TableHeader>
              <TableHeader className="w-24 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Order level
              </TableHeader>
              <TableHeader className="w-20 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Level
              </TableHeader>
              <TableHeader className="w-24 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Featured
              </TableHeader>
              <TableHeader className="w-28 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Hot category
              </TableHeader>
              <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                <span className="sr-only">View more</span>
              </TableHeader>
              <TableHeader className="w-14">
                <span className="sr-only">Options</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((row) => {
              const rowFlags = flags.get(row.slug) ?? {
                featured: row.featured,
                hot: row.hot,
              };
              return (
                <TableRow
                  key={row.slug}
                  className="border-b border-dashed border-neutral-200"
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.name}`}
                      checked={selected.has(row.slug)}
                      onChange={() => toggleSelect(row.slug)}
                      className="size-4 rounded border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex size-10 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 text-neutral-700">
                      <AdminCategoryIcon iconKey={row.iconKey} />
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-neutral-800">{row.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {row.productCount} product
                      {row.productCount === 1 ? "" : "s"}
                      {row.childCount > 0 ? ` · ${row.childCount} sub` : ""}
                      {row.isActive ? "" : " · Hidden"}
                    </p>
                  </TableCell>
                  <TableCell className="text-neutral-600">
                    {row.parentName ?? "—"}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-neutral-700">
                    {row.orderLevel}
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-neutral-700">
                    {row.level}
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminToggleSwitch
                      label={`Featured: ${row.name}`}
                      checked={rowFlags.featured}
                      onChange={(value) =>
                        updateFlag(row.slug, "featured", value)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <AdminToggleSwitch
                      label={`Hot: ${row.name}`}
                      checked={rowFlags.hot}
                      onChange={(value) => updateFlag(row.slug, "hot", value)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setDrawerSlug(row.slug)}
                      className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-[#3897f0] hover:bg-[#3897f0] hover:text-white"
                    >
                      View more
                    </button>
                  </TableCell>
                  <TableCell>
                    <AdminCategoryRowActions
                      slug={row.slug}
                      name={row.name}
                      canDelete={canDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AdminCategoryDetailDrawer
        category={drawerCategory}
        open={drawerSlug != null}
        onClose={() => setDrawerSlug(null)}
      />
    </>
  );
}
