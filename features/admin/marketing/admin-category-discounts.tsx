"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { saveCategoryDiscountAction } from "@/features/admin/promotions/promotion-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryDiscountRow } from "@/lib/admin/promotions-offers-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminCategoryDiscounts({
  rows,
}: {
  rows: CategoryDiscountRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discounts, setDiscounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.slug, String(r.discountPercent)])),
  );
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      // `dateRangeLabel` carries a real YYYY-MM-DD when a start date is stored,
      // and the "Select Date" placeholder when there is none.
      rows.map((r) => [
        r.slug,
        /^\d{4}-\d{2}-\d{2}$/.test(r.dateRangeLabel) ? r.dateRangeLabel : "",
      ]),
    ),
  );

  /** One real save per row — the schema keeps one discount per category. */
  function persistRow(row: CategoryDiscountRow, percent: string, date: string) {
    startTransition(async () => {
      const result = await saveCategoryDiscountAction({
        categorySlug: row.slug,
        discountPercent: percent,
        startsAt: date || null,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(`Discount saved for ${row.name}`);
      router.refresh();
    });
  }

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.parentName?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, query]);

  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 pt-5 sm:px-5">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Set Category Wise Product Discount
          </h1>
          <nav className="mt-4 flex" aria-label="Category discount views">
            <span className="-mb-px border-b-2 border-[#3897f0] pb-3 text-sm font-medium text-[#3897f0]">
              All categories
            </span>
          </nav>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Categories..."
              className={cn(controlClass, "pl-9")}
            />
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
                      else setSelected(new Set(items.map((r) => r.slug)));
                    }}
                    aria-label="Select all categories"
                    className="size-4 rounded border-neutral-300"
                  />
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Icon
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Name
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Parent
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Products
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Discount (%)
                </TableHeader>
                <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Date range
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.slug}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(row.slug)}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.slug)) next.delete(row.slug);
                          else next.add(row.slug);
                          return next;
                        });
                      }}
                      aria-label={`Select ${row.name}`}
                      className="size-4 rounded border-neutral-300"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50 text-xs font-semibold text-neutral-400">
                      {row.iconSrc ? (
                        <Image
                          src={row.iconSrc}
                          alt=""
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        row.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-neutral-900">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {row.parentName ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm text-neutral-700">
                    {row.productCount}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discounts[row.slug] ?? "0"}
                      onChange={(event) => {
                        setDiscounts((prev) => ({
                          ...prev,
                          [row.slug]: event.target.value,
                        }));
                      }}
                      onBlur={(event) =>
                        persistRow(
                          row,
                          event.target.value,
                          dates[row.slug] ?? "",
                        )
                      }
                      className={cn(controlClass, "w-20")}
                      aria-label={`Discount for ${row.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={dates[row.slug] ?? ""}
                      onChange={(event) => {
                        const nextDate = event.target.value;
                        setDates((prev) => ({
                          ...prev,
                          [row.slug]: nextDate,
                        }));
                        persistRow(row, discounts[row.slug] ?? "0", nextDate);
                      }}
                      className={cn(controlClass, "min-w-[9.5rem]")}
                      aria-label={`Date for ${row.name}`}
                    />
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
