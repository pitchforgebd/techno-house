"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminBrandDetailDrawer } from "@/features/admin/brands/admin-brand-detail-drawer";
import { AdminBrandRowActions } from "@/features/admin/brands/admin-brand-row-actions";
import {
  truncateCategoryLabel,
  type AdminBrandRow,
} from "@/lib/admin/brands-admin-mock";

export function AdminBrandTable({
  items,
  canDelete,
  selected,
  onSelectedChange,
}: {
  items: AdminBrandRow[];
  canDelete: boolean;
  selected: Set<string>;
  onSelectedChange: (next: Set<string>) => void;
}) {
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null);

  const drawerBrand = items.find((item) => item.slug === drawerSlug) ?? null;
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

  return (
    <>
      <div className="th-scroll-hide overflow-x-auto">
        <Table className="min-w-[56rem] text-caption">
          <TableHead>
            <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
              <TableHeader className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all brands"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="size-4 rounded border-border"
                />
              </TableHeader>
              <TableHeader className="w-24 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Logo
              </TableHeader>
              <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Name
              </TableHeader>
              <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Qty products
              </TableHeader>
              <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Created
              </TableHeader>
              <TableHeader className="min-w-[14rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                Categories
              </TableHeader>
              <TableHeader className="w-14">
                <span className="sr-only">Options</span>
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((brand) => {
              const categoriesLabel = truncateCategoryLabel(brand.categories);
              return (
                <TableRow
                  key={brand.slug}
                  className="border-b border-dashed border-neutral-200"
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${brand.name}`}
                      checked={selected.has(brand.slug)}
                      onChange={() => toggleSelect(brand.slug)}
                      className="size-4 rounded border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <span className="relative inline-flex h-12 w-20 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-white p-1.5">
                      <Image
                        src={brand.logoSrc}
                        alt=""
                        width={72}
                        height={40}
                        className="object-contain"
                      />
                    </span>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-neutral-800">
                      {brand.name}
                    </p>
                    {brand.isActive ? null : (
                      <p className="mt-0.5 text-xs text-neutral-400">Hidden</p>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums text-neutral-800">
                    {brand.productCount}
                  </TableCell>
                  <TableCell className="text-neutral-700">
                    {brand.createdLabel}
                  </TableCell>
                  <TableCell>
                    <p className="text-neutral-600">{categoriesLabel.text}</p>
                    {brand.categories.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDrawerSlug(brand.slug)}
                        className="mt-1 text-sm font-medium text-[#3897f0] hover:underline"
                      >
                        See more
                      </button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <AdminBrandRowActions
                      slug={brand.slug}
                      name={brand.name}
                      canDelete={canDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AdminBrandDetailDrawer
        brand={drawerBrand}
        open={drawerSlug != null}
        onClose={() => setDrawerSlug(null)}
      />
    </>
  );
}
