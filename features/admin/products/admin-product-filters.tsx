"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import { PRODUCT_SORT_LABELS, PRODUCT_SORTS } from "@/lib/catalog/listing-params";
import {
  bulkDeleteAdminProductsAction,
  bulkSetAdminProductPublishedAction,
} from "@/features/admin/products/product-actions";
import {
  STOCK_FILTER_LABELS,
  adminProductsHref,
  type AdminProductListParams,
  type AdminStockFilter,
} from "@/lib/admin/product-list-params";

function ToolbarField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
        aria-hidden
      />
    </div>
  );
}

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm transition-colors placeholder:text-neutral-400 hover:border-neutral-300 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminProductFilters({
  params,
  selectedIds,
  canDelete,
  onBulkDone,
}: {
  params: AdminProductListParams;
  selectedIds: string[];
  canDelete: boolean;
  onBulkDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(next: Partial<AdminProductListParams>) {
    router.push(adminProductsHref({ base: params, ...next, page: 1 }));
  }

  function runBulk(value: string) {
    if (selectedIds.length === 0) {
      notifyError("Select at least one product first.");
      return;
    }
    if (value === "delete") {
      if (!canDelete) {
        notifyError("You do not have permission to delete products.");
        return;
      }
      if (
        !window.confirm(
          `Delete ${selectedIds.length} selected product${selectedIds.length === 1 ? "" : "s"}? Products on orders or campaigns cannot be deleted.`,
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const result =
        value === "delete"
          ? await bulkDeleteAdminProductsAction(selectedIds)
          : await bulkSetAdminProductPublishedAction(
              selectedIds,
              value === "publish",
            );
      const verb =
        value === "delete"
          ? "deleted"
          : value === "publish"
            ? "published"
            : "unpublished";
      const summary = summarizeBulkResult(result, verb);
      if (summary.tone === "success") {
        notifySuccess(summary.message);
      } else {
        notifyError(summary.message);
      }
      onBulkDone();
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
      <form
        method="get"
        action="/admin/products"
        className="relative min-w-0 sm:col-span-1"
      >
        {params.tab !== "all" ? (
          <input type="hidden" name="tab" value={params.tab} />
        ) : null}
        {params.stock !== "all" ? (
          <input type="hidden" name="stock" value={params.stock} />
        ) : null}
        {params.sort !== "newest" ? (
          <input type="hidden" name="sort" value={params.sort} />
        ) : null}
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="Search products..."
          className={cn(controlClass, "pl-9")}
        />
      </form>

      <ToolbarField className="sm:w-[10.5rem]">
        <Select
          defaultValue=""
          aria-label="Bulk action"
          disabled={pending}
          className={cn(controlClass, "cursor-pointer pr-9")}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) {
              return;
            }
            runBulk(value);
            event.target.value = "";
          }}
        >
          <option value="">
            {pending
              ? "Working…"
              : selectedIds.length > 0
                ? `Bulk action (${selectedIds.length} selected)`
                : "Bulk action"}
          </option>
          <option value="publish">Publish selected</option>
          <option value="unpublish">Unpublish selected</option>
          <option value="delete">Delete selected</option>
        </Select>
      </ToolbarField>

      <ToolbarField className="sm:w-[7.5rem]">
        <Select
          defaultValue={params.stock}
          aria-label="Filter by stock"
          className={cn(controlClass, "cursor-pointer pr-9")}
          onChange={(event) => {
            navigate({ stock: event.target.value as AdminStockFilter });
          }}
        >
          {(Object.keys(STOCK_FILTER_LABELS) as AdminStockFilter[]).map(
            (key) => (
              <option key={key} value={key}>
                {key === "all" ? "Filter" : STOCK_FILTER_LABELS[key]}
              </option>
            ),
          )}
        </Select>
      </ToolbarField>

      <ToolbarField className="sm:w-[7.5rem]">
        <Select
          defaultValue={params.sort}
          aria-label="Sort products"
          className={cn(controlClass, "cursor-pointer pr-9")}
          onChange={(event) => {
            navigate({
              sort: event.target.value as AdminProductListParams["sort"],
            });
          }}
        >
          {PRODUCT_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {sort === "newest" ? "Sort" : PRODUCT_SORT_LABELS[sort]}
            </option>
          ))}
        </Select>
      </ToolbarField>
    </div>
  );
}
