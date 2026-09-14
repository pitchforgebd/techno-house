"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Frown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import type { AdminProductQuestion } from "@/lib/admin/questions-mock";

export function AdminProductConversations({
  items,
}: {
  items: readonly AdminProductQuestion[];
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [...items];
    return items.filter(
      (row) =>
        row.question.toLowerCase().includes(needle) ||
        row.customerName.toLowerCase().includes(needle) ||
        row.productName.toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Conversations
        </h1>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search conversations"
          className="h-9 w-full max-w-xs rounded-md border border-neutral-200 bg-white px-3 text-sm shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <>
            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                # · Date · Title · Sender · Status · Options
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
              <Frown className="size-12 opacity-50" aria-hidden />
              <p className="text-sm">Nothing found</p>
            </div>
          </>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[48rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    #
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Date
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Title
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Sender
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="w-14 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row, index) => (
                  <TableRow key={row.id} className="border-b border-neutral-100">
                    <TableCell className="tabular-nums text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="text-neutral-600">{row.date}</TableCell>
                    <TableCell>
                      <p className="max-w-[20rem] truncate font-medium text-neutral-900">
                        {row.question}
                      </p>
                      <p className="text-xs text-neutral-400">{row.productName}</p>
                    </TableCell>
                    <TableCell className="text-neutral-700">
                      {row.customerName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          row.status === "answered"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700",
                        )}
                      >
                        {row.status === "answered" ? "Answered" : "Awaiting reply"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/questions/${row.id}`}
                        aria-label={`View conversation with ${row.customerName}`}
                        className="inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200"
                      >
                        <Eye className="size-3.5" aria-hidden />
                      </Link>
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
