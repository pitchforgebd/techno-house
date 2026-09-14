"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  notifyError,
  notifySuccess,
} from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveCategoryRefundDaysAction } from "@/features/admin/refunds/refund-settings-actions";
import type { Category } from "@/lib/data";
import type { RefundTypeMode } from "@/lib/refunds/settings";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminCategoryRefundList({
  categories,
  refundType,
  initialDays,
}: {
  categories: Category[];
  refundType: RefundTypeMode;
  initialDays: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"all" | "main">("all");
  const [q, setQ] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [daysMap, setDaysMap] = useState<Record<string, number>>(() => ({
    ...initialDays,
  }));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDays, setBulkDays] = useState("7");

  const productCountHint = (slug: string) => {
    let hash = 0;
    for (const char of slug) {
      hash = (hash + char.charCodeAt(0)) % 40;
    }
    return 4 + (hash % 20);
  };

  const rows = useMemo(() => {
    let list = [...categories];
    if (tab === "main") {
      list = list.filter((item) => !item.parentSlug);
    }
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query),
      );
    }
    if (unassignedOnly) {
      list = list.filter((item) => daysMap[item.slug] == null);
    }
    return list;
  }, [categories, daysMap, q, tab, unassignedOnly]);

  const allSelected =
    rows.length > 0 && rows.every((item) => selected.has(item.slug));

  function persistDays(next: Record<string, number>, message: string) {
    startTransition(async () => {
      const result = await saveCategoryRefundDaysAction({
        categoryDays: next,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setDaysMap(next);
      notifySuccess(message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Set category wise product refund
        </h1>
      </div>

      {refundType !== "category" ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-red-600">
          Category based refund is not activated. Active{" "}
          <Link
            href="/admin/refunds/settings"
            className="font-semibold text-[#3897f0] hover:underline"
          >
            Here
          </Link>
          .
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 pt-4 sm:px-5">
          <nav className="flex gap-6">
            {(
              [
                { id: "all", label: "All categories" },
                { id: "main", label: "Main categories" },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium ${
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setUnassignedOnly((value) => !value)}
            className={cn(
              "mb-2 inline-flex items-center gap-2 text-sm font-medium",
              unassignedOnly
                ? "text-red-600"
                : "text-red-500 hover:text-red-600",
            )}
          >
            Filter unassigned
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-red-200 bg-red-50">
              <Filter className="size-4" aria-hidden />
            </span>
          </button>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search categories ..."
                className={cn(controlClass, "pl-9")}
              />
            </div>
            <Input
              type="number"
              min={0}
              value={bulkDays}
              onChange={(event) => setBulkDays(event.target.value)}
              aria-label="Bulk assign days"
              className={cn(controlClass, "lg:w-28")}
              placeholder="Days"
            />
            <Button
              type="button"
              disabled={pending}
              className="bg-[#3897f0] hover:bg-[#2f86d8]"
              onClick={() => {
                if (selected.size === 0) {
                  notifyError("Select categories first");
                  return;
                }
                const days = Number.parseInt(bulkDays, 10);
                if (!Number.isFinite(days) || days < 0) {
                  notifyError("Enter valid days");
                  return;
                }
                const next = { ...daysMap };
                for (const slug of selected) {
                  next[slug] = days;
                }
                persistDays(next, `Bulk assigned ${days} days`);
                setSelected(new Set());
              }}
            >
              Bulk assign
            </Button>
            <Button
              type="button"
              disabled={pending}
              variant="secondary"
              onClick={() => persistDays(daysMap, "Category refund days saved")}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="th-scroll-hide overflow-x-auto">
          <Table className="min-w-[48rem] text-caption">
            <TableHead>
              <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                <TableHeader className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => {
                      if (allSelected) {
                        setSelected(new Set());
                        return;
                      }
                      setSelected(new Set(rows.map((item) => item.slug)));
                    }}
                    aria-label="Select all categories"
                    className="size-4 accent-[#3897f0]"
                  />
                </TableHeader>
                <TableHeader className="min-w-[12rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Name
                </TableHeader>
                <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Parent
                </TableHeader>
                <TableHeader className="w-24 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Products
                </TableHeader>
                <TableHeader className="w-48 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                  Refund request time (days)
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((category) => {
                const parent = category.parentSlug
                  ? (categories.find(
                      (item) => item.slug === category.parentSlug,
                    )?.name ?? category.parentSlug)
                  : "—";
                return (
                  <TableRow
                    key={category.slug}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(category.slug)}
                        onChange={() => {
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(category.slug)) {
                              next.delete(category.slug);
                            } else {
                              next.add(category.slug);
                            }
                            return next;
                          });
                        }}
                        aria-label={`Select ${category.name}`}
                        className="size-4 accent-[#3897f0]"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-neutral-800">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-neutral-600">{parent}</TableCell>
                    <TableCell className="tabular-nums text-neutral-700">
                      {productCountHint(category.slug)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={daysMap[category.slug] ?? ""}
                        placeholder="—"
                        onChange={(event) => {
                          const raw = event.target.value;
                          setDaysMap((current) => {
                            const next = { ...current };
                            if (raw === "") {
                              delete next[category.slug];
                            } else {
                              next[category.slug] = Number(raw);
                            }
                            return next;
                          });
                        }}
                        className={cn(
                          controlClass,
                          "max-w-[8rem] bg-neutral-50",
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
