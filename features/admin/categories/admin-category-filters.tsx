"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import {
  bulkDeleteAdminCategoriesAction,
  bulkSetAdminCategoriesFeaturedAction,
} from "@/features/admin/categories/category-actions";
import {
  adminCategoriesHref,
  type AdminCategoryListParams,
} from "@/lib/admin/category-list-params";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminCategoryFilters({
  params,
  selectedSlugs,
  canDelete,
  onBulkDone,
}: {
  params: AdminCategoryListParams;
  selectedSlugs: string[];
  canDelete: boolean;
  onBulkDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function runBulk(value: string) {
    if (selectedSlugs.length === 0) {
      notifyError("Select at least one category first.");
      return;
    }
    if (value === "delete") {
      if (!canDelete) {
        notifyError("You do not have permission to delete categories.");
        return;
      }
      if (
        !window.confirm(
          `Delete ${selectedSlugs.length} selected categor${selectedSlugs.length === 1 ? "y" : "ies"}? Categories with products or subcategories cannot be deleted.`,
        )
      ) {
        return;
      }
    }
    startTransition(async () => {
      const result =
        value === "delete"
          ? await bulkDeleteAdminCategoriesAction(selectedSlugs)
          : await bulkSetAdminCategoriesFeaturedAction(
              selectedSlugs,
              value === "feature",
            );
      const verb =
        value === "delete"
          ? "deleted"
          : value === "feature"
            ? "marked featured"
            : "unfeatured";
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <form
        method="get"
        action="/admin/categories"
        className="relative min-w-0"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const q = String(data.get("q") ?? "");
          router.push(
            adminCategoriesHref({ base: params, q, page: 1 }),
          );
        }}
      >
        {params.tab !== "all" ? (
          <input type="hidden" name="tab" value={params.tab} />
        ) : null}
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <Input
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="Search categories..."
          className={cn(controlClass, "pl-9")}
        />
      </form>

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
        <option value="feature">Mark featured</option>
        <option value="unfeature">Unfeature</option>
        <option value="delete">Delete selected</option>
      </Select>
    </div>
  );
}
