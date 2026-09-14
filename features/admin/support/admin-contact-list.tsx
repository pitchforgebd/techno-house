"use client";

import Link from "next/link";
import { Eye, Frown } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactStatusBadge } from "@/features/admin/support/admin-support-badges";
import type { AdminContactListResult } from "@/lib/admin/load-support";
import { contactsHref } from "@/lib/admin/support-list-params";

export function AdminContactList({ data }: { data: AdminContactListResult }) {
  const { items, page, pageCount, params } = data;
  const startIndex = (page - 1) * data.pageSize;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
        Contacts
      </h1>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <>
            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                # · Name · Email · Phone · Query · Reply · Status · Options
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
              <Frown className="size-12 opacity-50" aria-hidden />
              <p className="text-sm">Nothing found</p>
            </div>
          </>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[64rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    #
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Name
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Email
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Phone
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Query
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Reply
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
                {items.map((contact, index) => (
                  <TableRow
                    key={contact.id}
                    className="border-b border-neutral-100"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900">
                      {contact.name}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {contact.email}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {contact.phone}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-neutral-800">
                      {contact.subject}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-neutral-500">
                      {contact.reply || "—"}
                    </TableCell>
                    <TableCell>
                      <ContactStatusBadge status={contact.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/contacts/${contact.id}`}
                        aria-label={`View contact from ${contact.name}`}
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

      {pageCount > 1 ? (
        <Pagination
          page={page}
          pageCount={pageCount}
          hrefForPage={(p) => contactsHref({ base: params, page: p })}
        />
      ) : null}
    </div>
  );
}
