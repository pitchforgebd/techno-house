"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { AdminProductFilters } from "@/features/admin/products/admin-product-filters";
import { AdminProductListTabs } from "@/features/admin/products/admin-product-list-tabs";
import { AdminProductTable } from "@/features/admin/products/admin-product-table";
import type { AdminProductListResult } from "@/lib/admin/load-products";
import { adminProductsHref } from "@/lib/admin/product-list-params";

export function AdminProductList({
  data,
  canAdd,
  canEdit,
  canDelete,
}: {
  data: AdminProductListResult;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { items, total, page, pageCount, categories, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All products
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} product{total === 1 ? "" : "s"} in your store catalog
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-4 sm:p-5">
          <AdminProductListTabs params={params} canAdd={canAdd} />
        </div>
        <div className="border-y border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <AdminProductFilters
            params={params}
            selectedIds={Array.from(selected)}
            canDelete={canDelete}
            onBulkDone={() => setSelected(new Set())}
          />
        </div>

        {items.length === 0 ? (
          <div className="border-t border-border p-8">
            <EmptyState
              title="No products match"
              description="Try another tab, clear filters, or search for a different name or SKU."
              action={
                <Link
                  href="/admin/products"
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
          <AdminProductTable
            items={items}
            categories={categories}
            canEdit={canEdit}
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
                adminProductsHref({ base: params, page: nextPage })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
