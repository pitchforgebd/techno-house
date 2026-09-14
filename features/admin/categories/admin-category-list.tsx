"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { AdminCategoryFilters } from "@/features/admin/categories/admin-category-filters";
import { AdminCategoryListTabs } from "@/features/admin/categories/admin-category-list-tabs";
import { AdminCategoryTable } from "@/features/admin/categories/admin-category-table";
import type { AdminCategoryListResult } from "@/lib/admin/load-categories";
import { adminCategoriesHref } from "@/lib/admin/category-list-params";

export function AdminCategoryList({
  data,
  canAdd,
  canDelete,
}: {
  data: AdminCategoryListResult;
  canAdd: boolean;
  canDelete: boolean;
}) {
  const { items, total, page, pageCount, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All categories
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} categor{total === 1 ? "y" : "ies"} from the storefront catalog
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-4 sm:p-5">
          <AdminCategoryListTabs params={params} canAdd={canAdd} />
        </div>
        <div className="border-y border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <AdminCategoryFilters
            params={params}
            selectedSlugs={Array.from(selected)}
            canDelete={canDelete}
            onBulkDone={() => setSelected(new Set())}
          />
        </div>

        {items.length === 0 ? (
          <div className="border-t border-border p-8">
            <EmptyState
              title="No categories match"
              description="Try another tab or clear the search."
              action={
                <Link
                  href="/admin/categories"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Reset filters
                </Link>
              }
            />
          </div>
        ) : (
          <AdminCategoryTable
            items={items}
            canDelete={canDelete}
            selected={selected}
            onSelectedChange={setSelected}
          />
        )}

        {pageCount > 1 ? (
          <div className="border-t border-border px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefForPage={(nextPage) =>
                adminCategoriesHref({ base: params, page: nextPage })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
