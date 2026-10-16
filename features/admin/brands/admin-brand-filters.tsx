"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import { AdminSearchInput } from "@/features/admin/admin-search-input";
import { bulkDeleteAdminBrandsAction } from "@/features/admin/brands/brand-actions";
import {
  adminBrandsHref,
  type AdminBrandListParams,
} from "@/lib/admin/brand-list-params";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminBrandFilters({
  params,
  selectedSlugs,
  canDelete,
  onBulkDone,
}: {
  params: AdminBrandListParams;
  selectedSlugs: string[];
  canDelete: boolean;
  onBulkDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runBulk(value: string) {
    if (selectedSlugs.length === 0) {
      notifyError("Select at least one brand first.");
      return;
    }
    if (value === "delete") {
      if (!canDelete) {
        notifyError("You do not have permission to delete brands.");
        return;
      }
      if (
        !window.confirm(
          `Delete ${selectedSlugs.length} selected brand${selectedSlugs.length === 1 ? "" : "s"}? Brands with products cannot be deleted.`,
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const result = await bulkDeleteAdminBrandsAction(selectedSlugs);
      const summary = summarizeBulkResult(result, "deleted");
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <AdminSearchInput
        defaultValue={params.q}
        buildHref={(q) => adminBrandsHref({ base: params, q, page: 1 })}
        placeholder="Search brands..."
        aria-label="Search brands"
        className={controlClass}
      />

      <Select
        defaultValue=""
        aria-label="Bulk action"
        disabled={pending}
        className={cn(controlClass, "sm:w-[10.5rem]")}
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
            : selectedSlugs.length > 0
              ? `Bulk action (${selectedSlugs.length} selected)`
              : "Bulk action"}
        </option>
        <option value="delete">Delete selected</option>
      </Select>
    </div>
  );
}
