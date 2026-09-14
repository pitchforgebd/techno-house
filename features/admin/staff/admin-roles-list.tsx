"use client";

import Link from "next/link";
import { Frown, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminRolesList({
  roles,
  canManage,
}: {
  roles: { key: string; name: string }[];
  canManage: boolean;
}) {
  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          All Role
        </h1>
        {canManage ? (
          <Link
            href="/admin/staff/roles/new"
            className="rounded-lg bg-[#6c5ce7] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5b4bd4]"
          >
            Add New Role
          </Link>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Roles</h2>
        </div>

        {roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
            <Frown className="size-12 opacity-50" aria-hidden />
            <p className="text-sm">Nothing found</p>
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[32rem] text-sm">
              <TableHead>
                <TableRow className="border-b border-neutral-100 hover:bg-transparent">
                  <TableHeader className="w-12 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    #
                  </TableHeader>
                  <TableHeader className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Name
                  </TableHeader>
                  <TableHeader className="w-20 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {roles.map((role, index) => (
                  <TableRow
                    key={role.key}
                    className="border-b border-neutral-50"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900">
                      {role.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/staff/roles/${role.key}`}
                        aria-label={`${canManage ? "Edit" : "View"} ${role.name}`}
                        className="inline-flex size-8 items-center justify-center rounded-full bg-sky-100 text-[#3897f0] hover:bg-sky-200"
                      >
                        <Pencil className="size-3.5" aria-hidden />
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
