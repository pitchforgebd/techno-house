"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Frown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketStatusBadge } from "@/features/admin/support/admin-support-badges";
import type { AdminTicketListResult } from "@/lib/admin/load-support";
import type { AdminSupportTicket } from "@/lib/admin/support-mock";
import { ticketsHref } from "@/lib/admin/support-list-params";
import { cn } from "@/lib/cn";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function lastReplyLabel(ticket: AdminSupportTicket): string {
  const last = ticket.messages[ticket.messages.length - 1];
  if (!last) return "—";
  return last.sentAt;
}

function sendingDate(ticket: AdminSupportTicket): string {
  return ticket.createdAt.split(" · ")[0] ?? ticket.createdAt;
}

export function AdminTicketList({ data }: { data: AdminTicketListResult }) {
  const router = useRouter();
  const { items, page, pageCount, params } = data;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Support Desk
        </h1>
        <form
          className="w-full max-w-xs sm:w-72"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            router.push(
              ticketsHref({
                base: params,
                q: String(form.get("q") ?? ""),
                page: 1,
              }),
            );
          }}
        >
          <Input
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Type ticket code & Enter"
            className={controlClass}
            aria-label="Search by ticket code"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <>
            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Ticket ID · Sending Date · Subject · User · Status · Last reply ·
                Options
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
              <Frown className="size-12 opacity-50" aria-hidden />
              <p className="text-sm">Nothing found</p>
            </div>
          </>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[56rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Ticket ID
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Sending Date
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Subject
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    User
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Status
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Last reply
                  </TableHeader>
                  <TableHeader className="w-14 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="border-b border-neutral-100"
                  >
                    <TableCell className="font-mono font-medium text-neutral-900">
                      {ticket.number}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {sendingDate(ticket)}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-neutral-800">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="text-neutral-700">
                      {ticket.customerName}
                    </TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {lastReplyLabel(ticket)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/support/${ticket.id}`}
                        aria-label={`View ${ticket.number}`}
                        className={cn(
                          "inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200",
                        )}
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

      {pageCount > 1 ? (
        <Pagination
          page={page}
          pageCount={pageCount}
          hrefForPage={(p) => ticketsHref({ base: params, page: p })}
        />
      ) : null}
    </div>
  );
}
