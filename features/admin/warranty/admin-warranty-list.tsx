"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
import { AdminWarrantyBadge } from "@/features/admin/warranty/admin-warranty-badge";
import { AdminWarrantyFormModal } from "@/features/admin/warranty/admin-warranty-form-modal";
import { AdminWarrantyRowActions } from "@/features/admin/warranty/admin-warranty-row-actions";
import { bulkDeleteWarrantiesAction } from "@/features/admin/catalog/preset-actions";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import type { AdminWarranty } from "@/lib/admin/warranties-mock";
import {
  adminWarrantiesHref,
  type AdminWarrantyListParams,
} from "@/lib/admin/warranty-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminWarrantyList({
  items,
  total,
  params,
}: {
  items: AdminWarranty[];
  total: number;
  params: AdminWarrantyListParams;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AdminWarranty | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function runBulk() {
    if (selected.size === 0) {
      notifyError("Select at least one warranty first.");
      return;
    }
    if (
      !window.confirm(
        `Deactivate ${selected.size} selected warrant${selected.size === 1 ? "y" : "ies"}? Products already using them keep their reference but the option is hidden from new products.`,
      )
    ) {
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkDeleteWarrantiesAction(ids);
      const summary = summarizeBulkResult(result, "deactivated");
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
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(warranty: AdminWarranty) {
    setModalMode("edit");
    setEditing(warranty);
    setModalOpen(true);
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
          All warranties
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} warranty option{total === 1 ? "" : "s"} for product pages
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <nav aria-label="Warranty views">
            <span className="-mb-px inline-block border-b-2 border-[#3897f0] pb-3 text-body font-medium text-[#3897f0]">
              All warranties
            </span>
          </nav>
          <div className="mb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="text-body font-medium text-[#3897f0] hover:underline"
            >
              Add new warranty
            </button>
            <button
              type="button"
              onClick={openCreate}
              aria-label="Add new warranty"
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <form
              className="relative min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const q = String(data.get("q") ?? "");
                router.push(adminWarrantiesHref({ base: params, q }));
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
                placeholder="Search warranties..."
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
                runBulk();
                event.target.value = "";
              }}
            >
              <option value="">
                {pending
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
              title="No warranties match"
              description="Try a different search, or add a new warranty."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/admin/warranty"
                    className={buttonClassName({
                      variant: "secondary",
                      size: "sm",
                    })}
                  >
                    Reset search
                  </Link>
                  <button
                    type="button"
                    onClick={openCreate}
                    className={buttonClassName({ size: "sm" })}
                  >
                    Add warranty
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[36rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all warranties"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-border"
                    />
                  </TableHeader>
                  <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Warranty text
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Logo
                  </TableHeader>
                  <TableHeader className="w-14 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((warranty) => (
                  <TableRow
                    key={warranty.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${warranty.text}`}
                        checked={selected.has(warranty.id)}
                        onChange={() => toggleSelect(warranty.id)}
                        className="size-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-800">
                        {warranty.text}
                      </p>
                    </TableCell>
                    <TableCell>
                      <AdminWarrantyBadge
                        badge={warranty.badge}
                        label={warranty.text}
                        logoSrc={warranty.logoSrc}
                      />
                    </TableCell>
                    <TableCell>
                      <AdminWarrantyRowActions
                        warranty={warranty}
                        onEdit={openEdit}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AdminWarrantyFormModal
        open={modalOpen}
        mode={modalMode}
        warranty={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
