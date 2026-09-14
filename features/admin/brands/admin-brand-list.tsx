"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { AdminBrandFilters } from "@/features/admin/brands/admin-brand-filters";
import { AdminBrandListTabs } from "@/features/admin/brands/admin-brand-list-tabs";
import { AdminBrandTable } from "@/features/admin/brands/admin-brand-table";
import type { AdminBrandListResult } from "@/lib/admin/load-brands";
import { adminBrandsHref } from "@/lib/admin/brand-list-params";

export function AdminBrandList({
  data,
  canAdd,
  canDelete,
}: {
  data: AdminBrandListResult;
  canAdd: boolean;
  canDelete: boolean;
}) {
  const { items, total, page, pageCount, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All brands
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} brand{total === 1 ? "" : "s"} from the storefront catalog
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-4 sm:p-5">
          <AdminBrandListTabs params={params} canAdd={canAdd} />
        </div>
        <div className="border-y border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <AdminBrandFilters
            params={params}
            selectedSlugs={Array.from(selected)}
            canDelete={canDelete}
            onBulkDone={() => setSelected(new Set())}
          />
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No brands match"
              description="Try another tab or clear the search."
              action={
                <Link
                  href="/admin/brands"
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
          <AdminBrandTable
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
                adminBrandsHref({ base: params, page: nextPage })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
