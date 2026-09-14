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
import { AdminUnitFormModal } from "@/features/admin/units/admin-unit-form-modal";
import { AdminUnitRowActions } from "@/features/admin/units/admin-unit-row-actions";
import { bulkDeleteUnitsAction } from "@/features/admin/catalog/preset-actions";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import type { AdminUnit } from "@/lib/admin/units-mock";
import {
  adminUnitsHref,
  type AdminUnitListParams,
} from "@/lib/admin/unit-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminUnitList({
  items,
  total,
  params,
}: {
  items: AdminUnit[];
  total: number;
  params: AdminUnitListParams;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AdminUnit | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function runBulk() {
    if (selected.size === 0) {
      notifyError("Select at least one unit first.");
      return;
    }
    if (
      !window.confirm(
        `Delete ${selected.size} selected unit${selected.size === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkDeleteUnitsAction(ids);
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
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(unit: AdminUnit) {
    setModalMode("edit");
    setEditing(unit);
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
          All units
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} sellable unit{total === 1 ? "" : "s"} for product quantity
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <nav aria-label="Unit views">
            <span className="-mb-px inline-block border-b-2 border-[#3897f0] pb-3 text-body font-medium text-[#3897f0]">
              All units
            </span>
          </nav>
          <div className="mb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="text-body font-medium text-[#3897f0] hover:underline"
            >
              Add new unit
            </button>
            <button
              type="button"
              onClick={openCreate}
              aria-label="Add new unit"
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
                router.push(adminUnitsHref({ base: params, q }));
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
                placeholder="Search units..."
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
              title="No units match"
              description="Try a different search, or add a new unit."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/admin/units"
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
                    Add unit
                  </button>
                </div>
              }
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[28rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all units"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-border"
                    />
                  </TableHeader>
                  <TableHeader className="text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Name
                  </TableHeader>
                  <TableHeader className="w-14 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((unit) => (
                  <TableRow
                    key={unit.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${unit.name}`}
                        checked={selected.has(unit.id)}
                        onChange={() => toggleSelect(unit.id)}
                        className="size-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-800">{unit.name}</p>
                    </TableCell>
                    <TableCell>
                      <AdminUnitRowActions unit={unit} onEdit={openEdit} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AdminUnitFormModal
        open={modalOpen}
        mode={modalMode}
        unit={editing}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
