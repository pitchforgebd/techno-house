"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Plus, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminCustomerRowActions } from "@/features/admin/customers/admin-customer-row-actions";
import {
  bulkSetCustomerBannedAction,
  bulkSetCustomerSuspiciousAction,
} from "@/features/admin/customers/customer-actions";
import type { AdminCustomer } from "@/lib/admin/customers-mock";
import {
  CUSTOMER_TAB_LABELS,
  adminCustomersHref,
  type AdminCustomerTab,
} from "@/lib/admin/customer-list-params";
import type { AdminCustomerListResult } from "@/lib/admin/load-customers";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const TABS: AdminCustomerTab[] = [
  "all",
  "banned",
  "suspicious",
  "verified",
  "unverified",
];

function nameClass(customer: AdminCustomer) {
  if (customer.status === "blocked") {
    return "font-semibold text-pink-600 hover:underline";
  }
  if (customer.suspicious) {
    return "font-semibold text-violet-600 hover:underline";
  }
  return "font-semibold text-neutral-900 hover:text-[#3897f0]";
}

export function AdminCustomerList({
  data,
}: {
  data: AdminCustomerListResult;
}) {
  const router = useRouter();
  const { items, total, page, pageCount, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const allSelected = items.length > 0 && selected.size === items.length;

  function runBulkAction(value: string) {
    const ids = [...selected];
    startTransition(async () => {
      const result =
        value === "ban"
          ? await bulkSetCustomerBannedAction({ ids, banned: true })
          : value === "unban"
            ? await bulkSetCustomerBannedAction({ ids, banned: false })
            : await bulkSetCustomerSuspiciousAction({ ids, suspicious: true });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not run that bulk action.");
        return;
      }
      notifySuccess(`Updated ${result.count} customer${result.count === 1 ? "" : "s"}.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function navigate(next: Partial<typeof params>) {
    router.push(adminCustomersHref({ base: params, ...next, page: 1 }));
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            All customers
          </h1>
          <ul className="mt-2 space-y-1 text-sm text-neutral-600">
            <li className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full bg-pink-500"
                aria-hidden
              />
              This color indicates that the customer is marked as blocked.
            </li>
            <li className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full bg-violet-500"
                aria-hidden
              />
              This color indicates that the customer is marked as suspicious.
            </li>
          </ul>
          <p className="mt-2 text-body text-text-muted">
            {total} customer{total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/customers/new"
            className="text-body font-medium text-[#3897f0] hover:underline"
          >
            Add new customer
          </Link>
          <Link
            href="/admin/customers/new"
            aria-label="Add new customer"
            className="inline-flex size-9 items-center justify-center rounded-full bg-[#3897f0] text-white shadow-sm hover:bg-[#2f86d8]"
          >
            <Plus className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-4 sm:p-5">
          <nav
            aria-label="Customer views"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {TABS.map((tab) => {
              const active = params.tab === tab;
              return (
                <Link
                  key={tab}
                  href={adminCustomersHref({ base: params, tab, page: 1 })}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {CUSTOMER_TAB_LABELS[tab]}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <form
              className="relative min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                navigate({ q: String(form.get("q") ?? "") });
              }}
            >
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Search customers ..."
                className={cn(controlClass, "pl-9")}
              />
            </form>
            <Select
              aria-label="Bulk action"
              defaultValue=""
              className={cn(controlClass, "sm:w-[10rem]")}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }
                event.target.value = "";
                if (selected.size === 0) {
                  notifyError("Select at least one customer first");
                  return;
                }
                runBulkAction(value);
              }}
            >
              <option value="">Bulk action</option>
              <option value="ban">Ban</option>
              <option value="unban">Unban</option>
              <option value="mark-suspicious">Mark suspicious</option>
            </Select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No customers match"
              description="Try another tab or search."
              action={
                <Link
                  href="/admin/customers"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Reset filters
                </Link>
              }
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[64rem] text-caption">
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
                        setSelected(new Set(items.map((item) => item.id)));
                      }}
                      aria-label="Select all customers"
                      className="size-4 accent-[#3897f0]"
                    />
                  </TableHeader>
                  <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Name
                  </TableHeader>
                  <TableHeader className="min-w-[12rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Email address
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Phone
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Package
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Wallet balance
                  </TableHeader>
                  <TableHeader className="w-36 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Verification status
                  </TableHeader>
                  <TableHeader className="w-14">
                    <span className="sr-only">Options</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(customer.id)}
                        onChange={() => {
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(customer.id)) {
                              next.delete(customer.id);
                            } else {
                              next.add(customer.id);
                            }
                            return next;
                          });
                        }}
                        aria-label={`Select ${customer.fullName}`}
                        className="size-4 accent-[#3897f0]"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className={nameClass(customer)}
                      >
                        {customer.fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {customer.email}
                    </TableCell>
                    <TableCell className="text-neutral-600">
                      {customer.phoneFull}
                    </TableCell>
                    <TableCell className="text-neutral-500">
                      {customer.packageLabel ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-neutral-700">
                      {formatMoney(customer.walletBalance)}
                    </TableCell>
                    <TableCell>
                      {customer.verified ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                          <CheckCircle2 className="size-4" aria-hidden />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-amber-500">
                          <AlertCircle className="size-4" aria-hidden />
                          Unverified
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AdminCustomerRowActions customer={customer} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="border-t border-border px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefForPage={(nextPage) =>
                adminCustomersHref({ base: params, page: nextPage })
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
