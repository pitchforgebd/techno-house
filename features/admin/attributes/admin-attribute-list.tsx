"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminAttributeFormDrawer } from "@/features/admin/attributes/admin-attribute-form-drawer";
import { AdminAttributeRowActions } from "@/features/admin/attributes/admin-attribute-row-actions";
import { bulkDeleteAdminAttributesAction } from "@/features/admin/attributes/attribute-actions";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import type { AdminAttribute } from "@/lib/admin/attributes-mock";
import {
  adminAttributesHref,
  type AdminAttributeListParams,
} from "@/lib/admin/attribute-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminAttributeList({
  items,
  total,
  page,
  pageCount,
  params,
  canAdd,
  canEdit,
  canDelete,
}: {
  items: AdminAttribute[];
  total: number;
  page: number;
  pageCount: number;
  params: AdminAttributeListParams;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AdminAttribute | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function runBulk() {
    if (selected.size === 0) {
      notifyError("Select at least one attribute first.");
      return;
    }
    if (!canDelete) {
      notifyError("You do not have permission to delete attributes.");
      return;
    }
    if (
      !window.confirm(
        `Delete ${selected.size} selected attribute${selected.size === 1 ? "" : "s"}? Attributes with values in use cannot be deleted.`,
      )
    ) {
      return;
    }
    startBulkTransition(async () => {
      const result = await bulkDeleteAdminAttributesAction(
        Array.from(selected),
      );
      const summary = summarizeBulkResult(result, "deleted");
      if (summary.tone === "success") {
        notifySuccess(summary.message);
      } else {
        notifyError(summary.message);
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  function openCreate() {
    if (!canAdd) {
      return;
    }
    setDrawerMode("create");
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(attribute: AdminAttribute) {
    setDrawerMode("edit");
    setEditing(attribute);
    setDrawerOpen(true);
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((item) => item.id)));
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All attributes
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} gadget attribut{total === 1 ? "e" : "es"} for product filters
          and variations
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <nav aria-label="Attribute views">
            <span className="-mb-px inline-block border-b-2 border-[#3897f0] pb-3 text-body font-medium text-[#3897f0]">
              All attributes
            </span>
          </nav>
          {canAdd ? (
            <div className="mb-1 flex items-center gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="text-body font-medium text-[#3897f0] hover:underline"
              >
                Add new attribute
              </button>
              <button
                type="button"
                onClick={openCreate}
                aria-label="Add new attribute"
                className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
              >
                <Plus className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="mb-1" />
          )}
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <form
              className="relative min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const q = String(data.get("q") ?? "");
                router.push(adminAttributesHref({ base: params, q, page: 1 }));
              }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Search attributes..."
                className={cn(controlClass, "pl-9")}
              />
            </form>
            <Select
              defaultValue=""
              aria-label="Bulk action"
              disabled={bulkPending}
              className={cn(controlClass, "sm:w-[10.5rem]")}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }
                runBulk();
                event.target.value = "";
              }}
            >
              <option value="">
                {bulkPending
                  ? "Working…"
                  : selected.size > 0
                    ? `Bulk action (${selected.size} selected)`
                    : "Bulk action"}
              </option>
              <option value="delete">Delete selected</option>
            </Select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No attributes match"
              description="Try a different search, or add a new gadget attribute."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/admin/attributes"
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Reset search
                  </Link>
                  {canAdd ? (
                    <button
                      type="button"
                      onClick={openCreate}
                      className={buttonClassName({ size: "sm" })}
                    >
                      Add attribute
                    </button>
                  ) : null}
                </div>
              }
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[48rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all attributes"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-border"
                    />
                  </TableHeader>
                  <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Name
                  </TableHeader>
                  <TableHeader className="min-w-[20rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Values
                  </TableHeader>
                  <TableHeader className="w-14">
                    <span className="sr-only">Options</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((attribute) => (
                  <TableRow
                    key={attribute.id}
                    className="border-b border-dashed border-neutral-200 align-top"
                  >
                    <TableCell className="pt-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${attribute.name}`}
                        checked={selected.has(attribute.id)}
                        onChange={() => toggleSelect(attribute.id)}
                        className="size-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell className="pt-4">
                      <p className="font-medium text-neutral-800">
                        {attribute.name}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {attribute.key}
                        {attribute.isFilterable ? "" : " · Not a filter"}
                      </p>
                    </TableCell>
                    <TableCell className="pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {attribute.values.map((value) => (
                          <span
                            key={`${attribute.id}-${value}`}
                            className="inline-flex rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="pt-3">
                      <AdminAttributeRowActions
                        attribute={attribute}
                        canDelete={canDelete}
                        onEdit={openEdit}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="border-t border-border px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefForPage={(nextPage) =>
                adminAttributesHref({ base: params, page: nextPage })
              }
            />
          </div>
        ) : null}
      </div>

      <AdminAttributeFormDrawer
        open={drawerOpen}
        mode={drawerMode}
        attribute={editing}
        canSave={drawerMode === "create" ? canAdd : canEdit}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
