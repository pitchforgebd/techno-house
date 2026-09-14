"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Frown, Pencil, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { deleteAdminQuestionAction } from "@/features/admin/questions/question-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminProductQuestion } from "@/lib/admin/questions-mock";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function QuestionStatusBadge({
  status,
}: {
  status: AdminProductQuestion["status"];
}) {
  const answered = status === "answered";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        answered
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      )}
    >
      {answered ? "Answered" : "Pending"}
    </span>
  );
}

export function AdminQuestionsList({
  items,
  canAnswer,
  canDelete,
}: {
  items: AdminProductQuestion[];
  canAnswer: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        item.question.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q),
    );
  }, [items, query]);

  function handleDelete(item: AdminProductQuestion) {
    if (!canDelete) {
      notifyError("You do not have permission to delete questions.");
      return;
    }
    if (!window.confirm("Delete this question?")) {
      return;
    }
    startTransition(async () => {
      const result = await deleteAdminQuestionAction(item.id);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not delete the question.");
        return;
      }
      notifySuccess("Question deleted");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Product Questions
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {items.length} customer question{items.length === 1 ? "" : "s"} on
          product pages
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
              placeholder="Search questions..."
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
            <Table className="min-w-[64rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    #
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Date
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Product
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Question
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Customer
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
                {filtered.map((item, index) => {
                  const expanded = expandedId === item.id;
                  return (
                    <Fragment key={item.id}>
                      <TableRow className="border-b border-neutral-100">
                        <TableCell className="tabular-nums text-neutral-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-neutral-600">
                          {item.date}
                        </TableCell>
                        <TableCell className="font-medium text-neutral-900">
                          {item.productName}
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate text-neutral-800">
                          {item.question}
                        </TableCell>
                        <TableCell className="text-neutral-600">
                          {item.customerName}
                        </TableCell>
                        <TableCell>
                          <QuestionStatusBadge status={item.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`View question from ${item.customerName}`}
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedId(expanded ? null : item.id)
                              }
                              className="inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200"
                            >
                              <Eye className="size-3.5" aria-hidden />
                            </button>
                            {canAnswer ? (
                              <Link
                                href={`/admin/questions/${item.id}`}
                                aria-label={`Answer question from ${item.customerName}`}
                                className="inline-flex size-8 items-center justify-center rounded-full bg-[#6c5ce7]/10 text-[#6c5ce7] hover:bg-[#6c5ce7]/20"
                              >
                                <Pencil className="size-3.5" aria-hidden />
                              </Link>
                            ) : null}
                            {canDelete ? (
                              <button
                                type="button"
                                aria-label={`Delete question from ${item.customerName}`}
                                disabled={pending}
                                onClick={() => handleDelete(item)}
                                className="inline-flex size-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                <Trash2 className="size-3.5" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow className="border-b border-neutral-100 bg-neutral-50/60">
                          <TableCell colSpan={7} className="px-5 py-4">
                            <div className="space-y-2 text-sm">
                              <p className="font-medium text-neutral-900">
                                {item.question}
                              </p>
                              <p className="text-neutral-500">
                                {item.customerName} · {item.customerEmail}
                              </p>
                              {item.answer ? (
                                <p className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-neutral-700">
                                  <span className="font-medium text-neutral-900">
                                    Answer:{" "}
                                  </span>
                                  {item.answer}
                                </p>
                              ) : (
                                <p className="text-neutral-400">
                                  No answer yet.
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
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
