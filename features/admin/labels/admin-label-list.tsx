"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  bulkDeleteLabelsAction,
  bulkSetLabelsActiveAction,
  setLabelActiveAction,
} from "@/features/admin/catalog/preset-actions";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminLabelBadge } from "@/features/admin/labels/admin-label-badge";
import { AdminLabelRowActions } from "@/features/admin/labels/admin-label-row-actions";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type { AdminCustomLabel } from "@/lib/admin/labels-mock";
import type { AdminLabelListResult } from "@/lib/admin/load-labels";
import {
  LABEL_TAB_LABELS,
  adminLabelsHref,
  type AdminLabelTab,
} from "@/lib/admin/label-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const TABS: AdminLabelTab[] = ["all", "inhouse"];

export function AdminLabelList({ data }: { data: AdminLabelListResult }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { items, total, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.status])),
  );
  // Read-only: the master switch has no backing setting yet, so it is
  // displayed disabled rather than faking a save.
  const storefrontEnabled = data.storefrontEnabled;

  const selectableIds = items.filter((item) => !item.isSystem).map((i) => i.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));

  function navigate(next: Partial<typeof params>) {
    router.push(adminLabelsHref({ base: params, ...next, page: 1 }));
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableIds));
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

  function sourceLabel(label: AdminCustomLabel) {
    return label.source === "system" ? "System" : "In-house";
  }

  function runBulk(value: string) {
    if (selected.size === 0) {
      notifyError("Select at least one label first.");
      return;
    }
    if (value === "delete" && !window.confirm(
      `Delete ${selected.size} selected label${selected.size === 1 ? "" : "s"}? They will also be removed from any products using them.`,
    )) {
      return;
    }
    const ids = Array.from(selected);
    startTransition(async () => {
      const result =
        value === "delete"
          ? await bulkDeleteLabelsAction(ids)
          : await bulkSetLabelsActiveAction(ids, value === "enable");
      const verb =
        value === "delete" ? "deleted" : value === "enable" ? "enabled" : "disabled";
      const summary = summarizeBulkResult(result, verb);
      if (summary.tone === "success") {
        notifySuccess(summary.message);
      } else {
        notifyError(summary.message);
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          All custom labels
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} product badge{total === 1 ? "" : "s"} for the storefront
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-start gap-3">
          <AdminToggleSwitch
            label="Show custom labels on storefront"
            checked={storefrontEnabled}
            disabled
            onChange={() => {}}
          />
          <span className="text-body text-neutral-800">
            <span className="font-medium">
              Show custom labels on storefront
            </span>
            <span className="mt-0.5 block text-caption text-neutral-500">
              A single master switch is not available yet, so this control is
              disabled rather than pretending to save. Use the{" "}
              <span className="font-medium">Status</span> toggle on each label
              below — that one is live and hides the badge from the storefront
              immediately.
            </span>
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <nav
            aria-label="Label views"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            {TABS.map((tab) => {
              const active = params.tab === tab;
              return (
                <Link
                  key={tab}
                  href={adminLabelsHref({ base: params, tab, page: 1 })}
                  className={`-mb-px border-b-2 pb-3 text-body font-medium transition-colors ${
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {LABEL_TAB_LABELS[tab]}
                </Link>
              );
            })}
          </nav>
          <div className="mb-1 flex items-center gap-2">
            <Link
              href="/admin/labels/new"
              className="text-body font-medium text-[#3897f0] hover:underline"
            >
              Add new custom label
            </Link>
            <Link
              href="/admin/labels/new"
              aria-label="Add new custom label"
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
            >
              <Plus className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <form
              className="relative min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                navigate({ q: String(form.get("q") ?? "") });
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
                placeholder="Search custom label ..."
                className={cn(controlClass, "pl-9")}
              />
            </form>
            <Select
              aria-label="Bulk action"
              defaultValue=""
              disabled={pending}
              className={cn(controlClass, "sm:w-[10rem]")}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }
                event.target.value = "";
                runBulk(value);
              }}
            >
              <option value="">
                {pending
                  ? "Working…"
                  : selected.size > 0
                    ? `Bulk action (${selected.size} selected)`
                    : "Bulk action"}
              </option>
              <option value="enable">Enable</option>
              <option value="disable">Disable</option>
              <option value="delete">Delete</option>
            </Select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No custom labels match"
              description="Try another tab or search."
              action={
                <Link
                  href="/admin/labels"
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
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[48rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all editable labels"
                      className="size-4 accent-[#3897f0]"
                    />
                  </TableHeader>
                  <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Label
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Source
                  </TableHeader>
                  <TableHeader className="w-24 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Status
                  </TableHeader>
                  <TableHeader className="w-14">
                    <span className="sr-only">Options</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const checked = statusMap[item.id] ?? item.status;
                  return (
                    <TableRow
                      key={item.id}
                      className="border-b border-dashed border-neutral-200"
                    >
                      <TableCell>
                        {item.isSystem ? (
                          <Lock
                            className="size-4 text-neutral-400"
                            aria-label="System label locked"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={selected.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            aria-label={`Select ${item.text}`}
                            className="size-4 accent-[#3897f0]"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <AdminLabelBadge
                          text={item.text}
                          backgroundColor={item.backgroundColor}
                          textTone={item.textTone}
                        />
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {sourceLabel(item)}
                      </TableCell>
                      <TableCell>
                        <AdminToggleSwitch
                          label={`Status for ${item.text}`}
                          checked={checked}
                          onChange={(next) => {
                            setStatusMap((current) => ({
                              ...current,
                              [item.id]: next,
                            }));
                            startTransition(async () => {
                              const result = await setLabelActiveAction(
                                item.id,
                                next,
                              );
                              if (!result.ok) {
                                // Put the switch back — the change did not save.
                                setStatusMap((current) => ({
                                  ...current,
                                  [item.id]: !next,
                                }));
                                notifyError(result.formError);
                                return;
                              }
                              notifySuccess(
                                next
                                  ? `“${item.text}” enabled`
                                  : `“${item.text}” disabled`,
                              );
                              router.refresh();
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <AdminLabelRowActions
                          labelId={item.id}
                          labelText={item.text}
                          locked={item.isSystem}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
