"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Frown, Pencil, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminProductRequest } from "@/lib/admin/product-requests-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function RequestStatusBadge({
  status,
}: {
  status: AdminProductRequest["status"];
}) {
  const styles = {
    new: "bg-sky-50 text-sky-700",
    reviewed: "bg-amber-50 text-amber-700",
    closed: "bg-neutral-100 text-neutral-600",
  } as const;
  const labels = {
    new: "New",
    reviewed: "Reviewed",
    closed: "Closed",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

export function AdminProductRequestsList({
  items,
}: {
  items: AdminProductRequest[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.customerName.toLowerCase().includes(q) ||
        item.customerEmail.toLowerCase().includes(q) ||
        item.productWanted.toLowerCase().includes(q) ||
        item.notes.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Product Requests
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {items.length} storefront request{items.length === 1 ? "" : "s"} in
          inbox
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <form
            className="relative max-w-md"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests..."
              className={cn(controlClass, "pl-9")}
            />
          </form>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
            <Frown className="size-12 opacity-50" aria-hidden />
            <p className="text-sm">Nothing found</p>
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    #
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Date
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Customer
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Product
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="w-24 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-neutral-100"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-neutral-600">
                      {item.date}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-neutral-900">
                        {item.customerName}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {item.customerEmail}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate font-medium text-neutral-800">
                      {item.productWanted}
                    </TableCell>
                    <TableCell>
                      <RequestStatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/product-requests/${item.id}`}
                          aria-label={`View request from ${item.customerName}`}
                          className="inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200"
                        >
                          <Eye className="size-3.5" aria-hidden />
                        </Link>
                        <Link
                          href={`/admin/product-requests/${item.id}`}
                          aria-label={`Manage request from ${item.customerName}`}
                          className="inline-flex size-8 items-center justify-center rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7] hover:bg-[#6c5ce7]/20"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
