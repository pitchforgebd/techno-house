"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Frown, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  staffHref,
  type StaffListResult,
} from "@/lib/admin/staff-list-shared";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminStaffList({ data }: { data: StaffListResult }) {
  const router = useRouter();
  const { items, total, params } = data;
  const startIndex = (params.page - 1) * data.pageSize;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          All staffs
        </h1>
        <Link
          href="/admin/staff/new"
          className="rounded-lg bg-[#6c5ce7] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#5b4bd4]"
        >
          Add New Staffs
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">Staffs</h2>
          <form
            className="w-full max-w-xs sm:w-64"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              router.push(
                staffHref({
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
              placeholder="Search name, email, phone…"
              className={controlClass}
              aria-label="Search staff"
            />
          </form>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-20 text-neutral-400">
            <Frown className="size-12 opacity-50" aria-hidden />
            <p className="text-sm">Nothing found</p>
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[48rem] text-sm">
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
                    Role
                  </TableHeader>
                  <TableHeader className="w-20 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    Options
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((member, index) => (
                  <TableRow
                    key={member.id}
                    className="border-b border-neutral-50"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-neutral-900">
                      {member.fullName}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {member.email}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {member.phone}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {member.role?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/staff/${member.id}`}
                        aria-label={`Edit ${member.fullName}`}
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

      {total > 0 ? (
        <p className="text-xs text-neutral-400">
          {total} staff member{total === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}
