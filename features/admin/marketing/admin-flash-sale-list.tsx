"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImageIcon, MoreVertical, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  bulkDeleteFlashSalesAction,
  bulkSetFlashSaleStatusAction,
  deleteFlashSaleAction,
  setFlashSaleFeaturedAction,
  setFlashSaleStatusAction,
} from "@/features/admin/flash-sales/flash-sale-actions";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminToggleSwitch } from "@/features/admin/products/admin-toggle-switch";
import type { FlashDealListResult } from "@/lib/admin/load-promotions-offers";
import type { FlashDealTab } from "@/lib/admin/promotions-offers-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const TABS: { id: FlashDealTab; label: string }[] = [
  { id: "all", label: "All Flash Deals" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

function flashHref(tab: FlashDealTab, q: string) {
  const query = new URLSearchParams();
  if (tab !== "all") query.set("tab", tab);
  if (q) query.set("q", q);
  const qs = query.toString();
  return qs ? `/admin/flash-sales?${qs}` : "/admin/flash-sales";
}

export function AdminFlashSaleList({ data }: { data: FlashDealListResult }) {
  const router = useRouter();
  const { items, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusMap, setStatusMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.statusOn])),
  );
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.featured])),
  );
  const [menuId, setMenuId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function runBulk(value: string) {
    if (selected.size === 0) {
      notifyError("Select at least one flash deal first.");
      return;
    }
    if (
      value === "delete" &&
      !window.confirm(
        `Delete ${selected.size} selected flash deal${selected.size === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    const ids = Array.from(selected);
    setFormError(null);
    startTransition(async () => {
      const result =
        value === "delete"
          ? await bulkDeleteFlashSalesAction(ids)
          : await bulkSetFlashSaleStatusAction(ids, value === "activate");
      const verb =
        value === "delete"
          ? "deleted"
          : value === "activate"
            ? "activated"
            : "deactivated";
      const summary = summarizeBulkResult(result, verb);
      if (summary.tone === "success") {
        notifySuccess(summary.message);
      } else {
        notifyError(summary.message);
        setFormError(summary.message);
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 pt-5 sm:px-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              All Flash Deals
            </h1>
            <nav
              aria-label="Flash deal views"
              className="mt-4 flex flex-wrap items-center gap-x-5"
            >
              {TABS.map((tab) => {
                const active = params.tab === tab.id;
                return (
                  <Link
                    key={tab.id}
                    href={flashHref(tab.id, params.q)}
                    className={cn(
                      "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                      active
                        ? "border-[#3897f0] text-[#3897f0]"
                        : "border-transparent text-text-muted hover:text-text",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 pb-3">
            <Link
              href="/admin/flash-sales/new"
              className="text-body font-medium text-[#3897f0] hover:underline"
            >
              Add New Flash Deal
            </Link>
            <Link
              href="/admin/flash-sales/new"
              aria-label="Add new flash deal"
              className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
            >
              <Plus className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        {formError ? (
          <div className="px-4 pt-3 sm:px-5">
            <Alert tone="danger" title="Could not update">
              <p className="text-caption">{formError}</p>
            </Alert>
          </div>
        ) : null}

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <form
              className="relative min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                router.push(flashHref(params.tab, String(form.get("q") ?? "")));
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
                placeholder="Search Flash Deals ..."
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
                if (!value) return;
                event.target.value = "";
                runBulk(value);
              }}
            >
              <option value="">
                {pending
                  ? "Working…"
                  : selected.size > 0
                    ? `Bulk action (${selected.size} selected)`
                    : "Bulk Action"}
              </option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="delete">Delete</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="bg-white hover:bg-white">
                <TableHeader className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) setSelected(new Set());
                      else setSelected(new Set(items.map((i) => i.id)));
                    }}
                    aria-label="Select all"
                    className="size-4 rounded border-neutral-300"
                  />
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Banner
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Title
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Start date
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  End date
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Status
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Featured
                </TableHeader>
                <TableHeader className="w-14 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Options
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      aria-label={`Select ${item.title}`}
                      className="size-4 rounded border-neutral-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex size-11 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50 text-neutral-300">
                      {item.bannerSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.bannerSrc}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-5" aria-hidden />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-neutral-900">
                    {item.title}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-neutral-600">
                    {item.startsAt}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-neutral-600">
                    {item.endsAt}
                  </TableCell>
                  <TableCell>
                    <AdminToggleSwitch
                      label={`Status for ${item.title}`}
                      checked={statusMap[item.id] ?? false}
                      onChange={(checked) => {
                        if (pending) {
                          return;
                        }
                        const previous = statusMap[item.id] ?? false;
                        setFormError(null);
                        setStatusMap((prev) => ({
                          ...prev,
                          [item.id]: checked,
                        }));
                        startTransition(async () => {
                          const result = await setFlashSaleStatusAction({
                            id: item.id,
                            statusOn: checked,
                          });
                          if (!result.ok) {
                            setStatusMap((prev) => ({
                              ...prev,
                              [item.id]: previous,
                            }));
                            setFormError(result.formError);
                            return;
                          }
                          notifySuccess(
                            checked
                              ? "Flash deal activated"
                              : "Flash deal deactivated",
                          );
                          router.refresh();
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <AdminToggleSwitch
                      label={`Featured for ${item.title}`}
                      checked={featuredMap[item.id] ?? false}
                      onChange={(checked) => {
                        if (pending) {
                          return;
                        }
                        const previous = featuredMap[item.id] ?? false;
                        setFormError(null);
                        setFeaturedMap((prev) => ({
                          ...prev,
                          [item.id]: checked,
                        }));
                        startTransition(async () => {
                          const result = await setFlashSaleFeaturedAction({
                            id: item.id,
                            featured: checked,
                          });
                          if (!result.ok) {
                            setFeaturedMap((prev) => ({
                              ...prev,
                              [item.id]: previous,
                            }));
                            setFormError(result.formError);
                            return;
                          }
                          notifySuccess(
                            checked ? "Marked featured" : "Unmarked featured",
                          );
                          router.refresh();
                        });
                      }}
                    />
                  </TableCell>
                  <TableCell className="relative">
                    <button
                      type="button"
                      aria-label={`Options for ${item.title}`}
                      onClick={() =>
                        setMenuId((id) => (id === item.id ? null : item.id))
                      }
                      className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {menuId === item.id ? (
                      <div className="absolute right-2 z-20 mt-1 min-w-[8rem] rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                        <Link
                          href={`/admin/flash-sales/${item.id}`}
                          className="block px-3 py-1.5 text-sm hover:bg-neutral-50"
                          onClick={() => setMenuId(null)}
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (pending) {
                              return;
                            }
                            setFormError(null);
                            setMenuId(null);
                            startTransition(async () => {
                              const result = await deleteFlashSaleAction({
                                id: item.id,
                              });
                              if (!result.ok) {
                                setFormError(result.formError);
                                notifyError(result.formError);
                                return;
                              }
                              notifySuccess("Flash deal deleted");
                              router.refresh();
                            });
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
