"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setSubscriberStatusAction } from "@/features/newsletter/newsletter-actions";
import type { NewsletterSubscriberRow } from "@/lib/content/newsletter-types";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function statusClass(status: NewsletterSubscriberRow["status"]) {
  if (status === "subscribed") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "bounced") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-neutral-100 text-neutral-600";
}

export function AdminSubscriberList({
  title,
  description,
  subscribers,
}: {
  title: string;
  description: string;
  subscribers: NewsletterSubscriberRow[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return subscribers;
    }
    return subscribers.filter(
      (row) =>
        row.email.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        row.source.toLowerCase().includes(needle),
    );
  }, [q, subscribers]);

  function handleToggle(row: NewsletterSubscriberRow) {
    const next = row.status === "subscribed" ? "unsubscribed" : "subscribed";
    startTransition(async () => {
      const result = await setSubscriberStatusAction({
        id: row.id,
        status: next,
      });
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      notifySuccess(
        next === "subscribed"
          ? `${row.email} subscribed`
          : `${row.email} unsubscribed`,
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        <p className="mt-1 text-body text-text-muted">{description}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              type="search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search subscribers..."
              className={cn(controlClass, "pl-9")}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No subscribers match"
              description="Try another search."
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[48rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Email
                  </TableHeader>
                  <TableHeader className="w-40 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Source
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Status
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Subscribed
                  </TableHeader>
                  <TableHeader className="w-36 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Action
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell className="font-medium text-neutral-900">
                      {row.email}
                      {row.name ? (
                        <p className="mt-0.5 text-xs font-normal text-neutral-500">
                          {row.name}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize text-neutral-600">
                      {row.source || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-[0.7rem] font-semibold capitalize",
                          statusClass(row.status),
                        )}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {row.subscribedAt}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={pending || row.status === "bounced"}
                        onClick={() => handleToggle(row)}
                        className="text-sm font-medium text-[#3897f0] hover:underline disabled:opacity-50"
                      >
                        {row.status === "subscribed"
                          ? "Unsubscribe"
                          : "Resubscribe"}
                      </button>
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
